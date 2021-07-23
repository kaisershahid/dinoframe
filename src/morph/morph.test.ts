import {Morph, Property, PropertySet, PropertyGet, Validate} from "./decorators";
import {FieldError, ObjectError} from "./types";

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

});
