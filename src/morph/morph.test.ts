import {
  Morph,
  Property,
  PropertySet,
  PropertyGet,
  Validate,
  getMorphDefinitions, getMorphTransformers, getTransformerByGid
} from "./decorators";
import {FieldError, ObjectError} from "./types";
import {Morpher} from "./morpher";


describe('module: morph', function () {
  describe('Morpher (against MorphBasic & MorphComplex)', () => {
    @Morph()
    class MorphBasic {
      @Property({required: true})
      title = ''
      private name: string = '';
      @Property({
        validator: (name) => {
          if (!name) {
            return {message: 'Must not be empty'}
          }
        },
        type: 'string'
      })
      validatedString = 'not empty';

      @Property({
        type: 'enum',
        enumValues: ['e1', 'f2']
      })
      anEnum = '';

      @Property({type: 'number'})
      aNumber = 0;

      @Property({type: 'boolean'})
      aBoolean = true;

      @Property({name: '*'})
      map: Record<string, any> = {};

      constructor() {
        // must be null-argument
      }

      @PropertySet('sourceName')
      setName(name: string) {
        if (!name || name.trim() == '') {
          throw new FieldError('cannot be empty');
        }
        this.name = name;
      }

      @PropertyGet('sourceName')
      getName() {
        return this.name;
      }

      @Validate()
      postDeserialize() {
        if (!this.title) {
          throw new ObjectError('MorphTest', {title: 'cannot be empty'})
        }
      }
    }

    @Morph()
    class MorphComplex {
      @Property()
      name = '';

      @Property({
        type: MorphBasic
      })
      basic: MorphBasic = undefined as any;
    }

    const srcValid = {title: 'valid', sourceName: 'valid sourceName', anEnum: 'e1', aNumber: 0, aBoolean: false}
    const getTransformer = () => getTransformerByGid(MorphBasic) as Morpher;
    const getComplexTransformer = () => getTransformerByGid(MorphComplex) as Morpher;
    const morphTestInst = getTransformer().deserialize<MorphBasic>(srcValid);

    it('deserializes with @Property', () => {
      expect(morphTestInst.title).toEqual(srcValid.title)
    })
    it('deserializes with @PropertySet', () => {
      expect(morphTestInst.getName()).toEqual(srcValid.sourceName)
    })
    it('serializes with @Property and @PropertyGet', () => {
      const inst = getTransformer().serialize(morphTestInst);
      expect(inst).toEqual({...srcValid, validatedString: 'not empty'});
    })

    it('deserializes and fails @Property.required (key absent)', () => {
      try {
        getTransformer().deserialize({});
      } catch (err) {
        expect(err.message).toEqual('One or more errors for: MorphTest')
        expect((err as ObjectError).fieldErrors.title).toEqual({message: 'required'})
      }
    })
    it('deserializes and fails @Property.required (null)', () => {
      try {
        getTransformer().deserialize({title: null});
      } catch (err) {
        expect(err.message).toEqual('One or more errors for: MorphTest')
        expect((err as ObjectError).fieldErrors.title).toEqual({message: 'required'})
      }
    })
    it(`deserializes and fails @Property.required ('')`, () => {
      try {
        getTransformer().deserialize({title: ''});
      } catch (err) {
        expect(err.message).toEqual('One or more errors for: MorphTest')
        expect((err as ObjectError).fieldErrors.title).toEqual({message: 'required'})
      }
    })
    it('deserializes and fails @Property.validator', () => {
      try {
        const inst = getTransformer().deserialize({...srcValid, validatedString: ''});
      } catch (err) {
        expect(err.message).toEqual('One or more errors for: MorphBasic')
        expect((err as ObjectError).fieldErrors).toEqual({validatedString: {message: 'Must not be empty'}})
      }
    })

    it(`deserializes and fails @Property.type=number ('a')`, () => {
      try {
        getTransformer().deserialize({...srcValid, aNumber: 'a'})
        throw new Error('expected error')
      } catch (e) {
        expect(e.fieldErrors.aNumber.message).toEqual('not a number: "a"')
      }
    })

    it(`deserializes and fails @Property.type=boolean ('a')`, () => {
      try {
        getTransformer().deserialize({...srcValid, aBoolean: 'a'})
        throw new Error('expected error')
      } catch (e) {
        expect(e.fieldErrors.aBoolean.message).toEqual('not a boolean: "a"')
      }
    })

    it(`deserializes and fails @Property.type=string (true)`, () => {
      try {
        getTransformer().deserialize({...srcValid, validatedString: true})
        throw new Error('expected error')
      } catch (e) {
        expect(e.fieldErrors.validatedString.message).toEqual('not a string: true')
      }
    })

    it(`deserializes and fails @Property.type=enum ('e')`, () => {
      const t = getTransformer();
      try {
        const inst = t.deserialize({...srcValid, anEnum: 'e'});
        throw new Error('expected error');
      } catch (e) {
        expect(e.fieldErrors.anEnum.message).toEqual('e does not match any enum values: [e1; f2]')
      }
    })

    it('deserializes/serializes complex value', () => {
      const src = {
        name: 'outerObject',
        basic: {
          title: 'inner',
          validatedString: 'vs',
          sourceName: 'basic',
          anEnum: 'f2',
          aNumber: 5,
          aBoolean: true
        }
      }
      const t = getComplexTransformer();
      const inst = t.deserialize(src)
      expect(t.serialize(inst)).toEqual(src);
    })
    it('deserializes/serializes map value with catch-all *', () => {
      const t = getTransformer();
      const src = {...srcValid, validatedString: 'x', key1: 1, key2: 'b'}
      const inst = t.deserialize(src);
      expect(t.serialize(inst)).toEqual(src)
    })
  })

  describe('Morpher polymorphism (agaist MorphPoly)', () => {
    /**
     * Defines default structure
     */
    @Morph({
      discriminator: "type",
      ignoreProps: ['ignorable']
    })
    class MorphPoly {
      @Property({required: true})
      type: string = null as any;

      @Property({required: true})
      name: string = '';

      @Property()
      ignorable = 'ignoreMe';
    }

    @Morph({
      inherits: {
        baseClass: MorphPoly,
        discriminatorValue: 'typeA'
      }
    })
    class MorphPolyA extends MorphPoly {
      @Property()
      propA = '';

      @PropertySet('name')
      setName(name: string) {
        this.name = name + '-A';
      }
    }

    @Morph({
      ignoreProps: ['ignorableB'],
      inherits: {
        baseClass: MorphPoly,
        discriminatorValue: 'typeB'
      }
    })
    class MorphPolyB extends MorphPoly {
      @Property()
      propB = '';

      @Property()
      ignorable = 'notIgnoredInB';

      @Property()
      ignorableB = '';

      @PropertyGet('name')
      getName() {
        return 'B-' + this.name;
      }
    }

    const srcA = {name: 'instA', type: 'typeA'};
    const srcB = {name: 'instB', type: 'typeB'};
    const t = getTransformerByGid(MorphPoly) as Morpher;

    it('deserializes to appropriate subclasses', () => {
      const instA = t.deserialize<MorphPolyA>(srcA);
      const instB = t.deserialize<MorphPolyB>(srcB);

      // asserts @PropertySet in A
      expect(instA.name).toEqual('instA-A');
      expect(instB.name).toEqual('instB');
    })

    it('serializes to appropriate maps', () => {
      const instA = t.deserialize<MorphPolyA>(srcA);
      const instB = t.deserialize<MorphPolyB>(srcB);

      expect(t.serialize(instA)).toEqual({name: 'instA-A', type: 'typeA', propA: ''});
      // asserts @PropertyGet in B
      expect(t.serialize(instB)).toEqual({name: 'B-instB', type: 'typeB', propB: '', ignorable: 'notIgnoredInB'});
    })

    it('fails deserializing unsupport discrinator value', () => {
      try {
        const inst = t.deserialize({})
      } catch (err) {
        expect(err.message).toEqual("MorphPoly: could not map type=undefined to a subclass: subclass is not a constructor")
      }

      try {
        const inst = t.deserialize({type: 'C'})
      } catch (err) {
        expect(err.message).toEqual("MorphPoly: could not map type=C to a subclass: subclass is not a constructor")
      }
    })
  })
});
