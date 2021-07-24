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
  @Property()
  title = ''
  private name: string = '';

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
    // @todo error condition
    // @todo apply validator
    it('serializes with @Property and @PropertyGet', () => {
      expect(getTransformer().serialize(morphTestInst)).toEqual(srcValid);
    })
  })
});
