import {
  Morph,
  Property,
  PropertySet,
  PropertyGet,
  Validate,
  getMorphDefinitions, getMorphTransformers, getTransformerByGid
} from "./decorators";
import {FieldError, ObjectError} from "./types";
import {Transformer} from "./transformer";

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
    }
  })
  validatedString = 'not empty';

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

describe('module: morph', function () {
  const srcValid = {title: 'valid', sourceName: 'valid sourceName'}
  const getTransformer = () => getTransformerByGid(MorphBasic) as Transformer;
  const getComplexTransformer = () => getTransformerByGid(MorphComplex) as Transformer;

  it('parses MorphTest class', () => {
    expect(getTransformer()).toBeDefined();
  });

  describe('Transformer (against MorphBasic & MorphComplex)', () => {
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
    // @todo deserializes and fails @Property.required for (type=number, type=enum)
    // @todo implement and test enum
    // @todo implement and test polymorph

    it('deserializes/serializes complex value', () => {
      const src = {
        name: 'outerObject',
        basic: {
          title: 'inner',
          validatedString: 'vs',
          sourceName: 'basic'
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
});
