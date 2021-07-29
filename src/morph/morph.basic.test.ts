import {
  Morph,
  Property,
  PropertySet,
  PropertyGet,
  Finalize,
  getMorpherById,
  Serialize,
  Deserialize,
} from "./decorators";
import { FieldError, ObjectError } from "./types";
import { MorphMarshaller, ValueFactory } from "./index";

/**
 * Validates `@Property`, `@PropertyGet`, `@PropertySet`, and `@Finalize`
 */
describe("module: morph", function () {
  describe("MorphMarshaller (against MorphBasic & MorphComplex)", () => {
    @Morph()
    class MorphBasic {
      @Property({ required: true })
      title = "";
      private name: string = "";
      @Property({
        validator: (name) => {
          if (!name) {
            return { message: "Must not be empty" };
          }
        },
        type: "string",
      })
      validatedString = "not empty";

      @Property({
        type: "enum",
        enumValues: ["e1", "f2"],
      })
      anEnum = "";

      @Property({ type: "number" })
      aNumber = 0;

      @Property({ type: "boolean" })
      aBoolean = true;

      @Property({ name: "*" })
      map: Record<string, any> = {};

      constructor() {
        // must be null-argument
      }

      @PropertySet("sourceName")
      setName(name: string) {
        if (!name || name.trim() == "") {
          throw new FieldError("cannot be empty");
        }
        this.name = name;
      }

      @PropertyGet("sourceName")
      getName() {
        return this.name;
      }

      @Finalize
      postDeserialize() {
        if (!this.title) {
          throw new ObjectError("MorphBasic", { title: "cannot be empty" });
        }
      }
    }

    @Morph()
    class MorphComplex {
      @Property()
      name = "";

      @Property({
        type: MorphBasic,
      })
      basic: MorphBasic = undefined as any;
    }

    @Morph()
    class MorphComplexArr {
      @Property()
      name = "";

      @Property({
        type: MorphBasic,
      })
      basic: MorphBasic[] = [];
    }

    const srcValid = {
      title: "valid",
      sourceName: "valid sourceName",
      anEnum: "e1",
      aNumber: 0,
      aBoolean: false,
    };
    const getTransformer = () => getMorpherById(MorphBasic) as MorphMarshaller;
    const getComplexTransformer = () =>
      getMorpherById(MorphComplex) as MorphMarshaller;
    const morphTestInst = getTransformer().deserialize<MorphBasic>(srcValid);

    it("deserializes with @Property", () => {
      expect(morphTestInst.title).toEqual(srcValid.title);
    });
    it("deserializes with @PropertySet", () => {
      expect(morphTestInst.getName()).toEqual(srcValid.sourceName);
    });
    it("serializes with @Property and @PropertyGet", () => {
      const inst = getTransformer().serialize(morphTestInst);
      expect(inst).toEqual({ ...srcValid, validatedString: "not empty" });
    });

    it("deserializes and fails @Finalize", () => {
      try {
        getTransformer().deserialize({ ...srcValid, title: "" });
        throw new Error("expected error");
      } catch (err) {
        expect(err.message).toEqual("One or more errors for: MorphBasic");
        expect(err.fieldErrors.title).toEqual({ message: "required" });
      }
    });
    it("deserializes and fails @Property.required (key absent)", () => {
      try {
        getTransformer().deserialize({});
      } catch (err) {
        expect(err.message).toEqual("One or more errors for: MorphBasic");
        expect((err as ObjectError).fieldErrors.title).toEqual({
          message: "required",
        });
      }
    });
    it("deserializes and fails @Property.required (null)", () => {
      try {
        getTransformer().deserialize({ title: null });
      } catch (err) {
        expect(err.message).toEqual("One or more errors for: MorphBasic");
        expect((err as ObjectError).fieldErrors.title).toEqual({
          message: "required",
        });
      }
    });
    it(`deserializes and fails @Property.required ('')`, () => {
      try {
        getTransformer().deserialize({ title: "" });
      } catch (err) {
        expect(err.message).toEqual("One or more errors for: MorphBasic");
        expect((err as ObjectError).fieldErrors.title).toEqual({
          message: "required",
        });
      }
    });
    it("deserializes and fails @Property.validator", () => {
      try {
        const inst = getTransformer().deserialize({
          ...srcValid,
          validatedString: "",
        });
      } catch (err) {
        expect(err.message).toEqual("One or more errors for: MorphBasic");
        expect((err as ObjectError).fieldErrors).toEqual({
          validatedString: { message: "Must not be empty" },
        });
      }
    });

    it(`deserializes and fails @Property.type=number ('a')`, () => {
      try {
        getTransformer().deserialize({ ...srcValid, aNumber: "a" });
        throw new Error("expected error");
      } catch (e) {
        expect(e.fieldErrors.aNumber.message).toEqual('not a number: "a"');
      }
    });

    it(`deserializes and fails @Property.type=boolean ('a')`, () => {
      try {
        getTransformer().deserialize({ ...srcValid, aBoolean: "a" });
        throw new Error("expected error");
      } catch (e) {
        expect(e.fieldErrors.aBoolean.message).toEqual('not a boolean: "a"');
      }
    });

    it(`deserializes and fails @Property.type=string (true)`, () => {
      try {
        getTransformer().deserialize({ ...srcValid, validatedString: true });
        throw new Error("expected error");
      } catch (e) {
        expect(e.fieldErrors.validatedString.message).toEqual(
          "not a string: true"
        );
      }
    });

    it(`deserializes and fails @Property.type=enum ('e')`, () => {
      const t = getTransformer();
      try {
        const inst = t.deserialize({ ...srcValid, anEnum: "e" });
        throw new Error("expected error");
      } catch (e) {
        expect(e.fieldErrors.anEnum.message).toEqual(
          "e does not match any enum values: [e1; f2]"
        );
      }
    });

    it("deserializes/serializes complex value", () => {
      const src = {
        name: "outerObject",
        basic: {
          title: "inner",
          validatedString: "vs",
          sourceName: "basic",
          anEnum: "f2",
          aNumber: 5,
          aBoolean: true,
        },
      };
      const t = getComplexTransformer();
      const inst = t.deserialize(src);
      expect(t.serialize(inst)).toEqual(src);
    });
    it("deserializes/serializes map value with catch-all *", () => {
      const t = getTransformer();
      const src = { ...srcValid, validatedString: "x", key1: 1, key2: "b" };
      const inst = t.deserialize(src);
      expect(t.serialize(inst)).toEqual(src);
    });
    it("deserializes complex array value", () => {
      const src = {
        name: "outerObject",
        basic: [
          {
            title: "inner",
            validatedString: "vs",
            sourceName: "basic",
            anEnum: "f2",
            aNumber: 5,
            aBoolean: true,
          },
          {
            title: "inner2",
            validatedString: "vs2",
            sourceName: "basic2",
            anEnum: "e1",
            aNumber: -1,
            aBoolean: false,
          },
        ],
      };
      const m = getMorpherById(MorphComplexArr);
      const inst = m?.deserialize(src);
      expect(m?.serialize(inst)).toEqual(src);
    });
  });

  describe("MorphMarshaller (manual serialization/deserialization)", () => {
    @Morph()
    class MorphManual {
      map: any = {};

      get(key: string) {
        return this.map[key];
      }

      @Deserialize
      deserialize(source: any) {
        if (source.error) {
          throw new ObjectError("failed", source);
        }
        this.map = { ...source };
      }

      @Serialize
      serialize() {
        return this.map;
      }
    }

    const m = getMorpherById(MorphManual);
    const src = { a: 1, b: 2 };
    it("uses @Deserialize", () => {
      const inst = m?.deserialize<MorphManual>(src);
      expect(inst?.get("a")).toEqual(1);
      expect(inst?.get("b")).toEqual(2);
    });

    it("uses @Serialize", () => {
      const inst = m?.deserialize<MorphManual>(src);
      expect(m?.serialize(inst)).toEqual(src);
    });

    it("propagates ObjectError on failed @Deserialize", () => {
      try {
        const inst = m?.deserialize<MorphManual>({ ...src, error: true });
      } catch (e) {
        expect(e.fieldErrors).toEqual({ ...src, error: true });
      }
    });
  });

  describe("ValueFactory", () => {
    const getMessage = (val: any, def: any) => {
      try {
        ValueFactory.validateValue(val, def);
        return "success";
      } catch (e) {
        return e.message;
      }
    };

    it("listType=strict: rejects scalar", () => {
      expect(getMessage("a", { listType: "strict" })).toEqual(
        "listType=strict, string given"
      );
    });
    it("listType=strict: accepts array", () => {
      expect(getMessage(["a"], { listType: "strict" })).toEqual("success");
    });
    it("listType=mixed: accepts scalar", () => {
      expect(getMessage("a", { listType: "mixed" })).toEqual("success");
    });
    it("listType=mixed: accepts array", () => {
      expect(getMessage(["a"], { listType: "mixed" })).toEqual("success");
    });
    it("listType=undefined|none: rejects array", () => {
      expect(getMessage(["a"], {})).toEqual("listType=none, array given");
    });

    it("type=string, val=[string,number]; rejects value", () => {
      expect(
        getMessage(["a", 1], { listType: "mixed", type: "string" })
      ).toEqual('one or more errors: {"1":"not a string: 1"}');
    });

    [
      {
        type: "boolean",
        success: true,
        val: true,
      },
      {
        type: "boolean",
        success: false,
        val: "true",
      },
      {
        type: "number",
        success: true,
        val: 1,
      },
      {
        type: "number",
        success: false,
        val: "1",
      },
      {
        type: "string",
        success: true,
        val: "true",
      },
      {
        type: "string",
        success: false,
        val: true,
      },
      {
        type: "enum",
        success: true,
        val: "a",
        enumValues: ["a", "b"],
      },
      {
        type: "enum",
        success: false,
        val: "ab",
        enumValues: ["a", "b"],
      },
      {
        type: "enum",
        listType: "mixed",
        success: true,
        val: ["a"],
        enumValues: ["a", "b"],
      },
      {
        type: "enum",
        listType: "mixed",
        success: false,
        val: ["ab"],
        enumValues: ["a", "b"],
        expectedErr:
          'one or more errors: {"0":"ab does not match any enum values: [a; b]"}',
      },
    ].forEach(({ type, success, val, enumValues, listType, expectedErr }) => {
      it(`${
        listType ? "listType=" + listType + ", " : ""
      }type=${type}, val=${typeof val}; ${
        success ? "accepts" : "rejects"
      } value`, () => {
        expectedErr =
          expectedErr ??
          (success
            ? "success"
            : enumValues
            ? `${val} does not match any enum values: [${enumValues.join(
                "; "
              )}]`
            : `not a ${type}: ${JSON.stringify(val)}`);
        expect(getMessage(val, { type, enumValues, listType })).toEqual(
          expectedErr
        );
      });
    });
  });
});
