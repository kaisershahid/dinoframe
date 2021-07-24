import {
  Morph,
  Property,
  PropertySet,
  PropertyGet,
  Validate,
  getMorphDefinitions, getMorphTransformers
} from "./decorators";
import {FieldError, ObjectError} from "./types";
import {Transformer} from "./transformer";

@Morph()
class MorphTest {
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

describe('module: morph', function () {
  const srcValid = {title: 'valid', sourceName: 'valid sourceName'}
  const getTransformer = () =>
    getMorphTransformers().filter(t => t.canHandle(MorphTest))[0];

  it('parses MorphTest class', () => {
    expect(getTransformer()).not.toBeNull();
  });

  describe('Transformer (against MorphTest)', () => {
    const morphTestInst = getTransformer().deserialize<MorphTest>(srcValid);
    it('deserializes with @Property', () => {
      expect(morphTestInst.title).toEqual(srcValid.title)
    })
    it('deserializes with @PropertySet', () => {
      expect(morphTestInst.getName()).toEqual(srcValid.sourceName)
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
    // @todo deserializes and fails @Property.required for (type=number, type=enum)
    // @todo implement and test enum
    // @todo implement and test *

    it('deserializes and fails @Property.validator', () => {
      try {
        const inst = getTransformer().deserialize({...srcValid, validatedString: ''});
      } catch (err) {
        expect(err.message).toEqual('One or more errors for: MorphTest')
        expect((err as ObjectError).fieldErrors).toEqual({validatedString: {message: 'Must not be empty'}})
      }
    })

    it('serializes with @Property and @PropertyGet', () => {
      const inst = getTransformer().serialize(morphTestInst);
      expect(inst).toEqual({...srcValid, validatedString: 'not empty'});
    })
  })
});
