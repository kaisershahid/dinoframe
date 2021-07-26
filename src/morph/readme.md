# Morph

The morph module provides a super-simple way to manage 2-way data serialization and draws a lot of ideas from the [jackson JSON library](https://github.com/FasterXML/jackson). It provides a surprising amount of flexibility while being lightweight.

## Simple Structures

To start, consider this class:

```typescript
import {getMorpherById, Morph, Property} from "./decorators";

@Morph()
class BasicMorph {
  // explicitly defines firstName as a string and invokes the validator() function before setting.
  // source value is expected to be 'firstName'
  @Property({
    type: 'string',
    validator: (val: any) => {
      if (!val || val.trim() == '') {
        return {message: 'cannot be empty'}
      }
    }
  })
  firstName = '';

  // sets 'familyName' source value to lastName and enforces required (not undefined/null/blank string/NaN)
  @Property({required: true, name: 'familyName'})
  lastName = '';

  // not explicitly defined as property, but setter and getter will be defined for it below  
  dob: Date = new Date(NaN);

  // define a setter so that you can do validation/normalization 
  @PropertySet('dob')
  setDOB(date: any) {
    this.dob = new Date(Date.parse(date));
  }

  // define a getter 
  @PropertyGet('dob')
  getDOB() {
    return this.dob.toISOString();
  }
}

const transformer = getMorpherById(BasicMorph);
const instance = transformer.deserialize({firstName: 'don', lastName: 'toilet-john'})
```

This defines 3 different properties and shows off some of the attributes we can attach. We give the morpher our map of source values, and during the deserialization process, the morpher will do the following:

- for each defined property
  - if validator is defined, invoke; skip set if error
  - else if required is defined, check; skip set if error
  - else if type is explicitly defined, enforce type; skip set if error
  - if setter is defined, call setter; catch/record error
  - else if property is defined, set property directly
- if 1+ errors occurred, throw error
- otherwise, return instance of target class

## More Complex Structures

We're not limited to simple scalar values. We can also deserialize properties to a class instance or capture unmapped source keys to a map:

```typescript
import {Morph, Property} from "./decorators";

@Morph()
class Profile {
  @Property()
  location = '';
  @Property()
  age = -1;
}

// allows morpher to properly apply parent decorators
@Morph({inherits: {baseClass: BasicMorph}})
class ComplexMorph extends BasicMorph {
  // expects the source 'profile' value to be a map and deserializes to Profile instance
  @Property({type: Profile})
  profile: any;

  // assumes the source 'properties' is an object
  @Property()
  properties: Record<string, any> = {}

  // collects all source keys that weren't explicitly mapped to a property
  // (e.g. everything else except 'profile' and 'properties')
  @Property({name: '*'})
  map: Record<string, any> = {}
}
```

## Polymorphism

Morph also supports limited polymorphism! Simply define the discriminator column on the main class and map each discriminator value to the subclasses:

```typescript
import {getMorpherById, Morph, Property} from "./decorators";

@Morph({
  discriminatorCol: 'type'
})
class PolyMain {
  @Property({required: true})
  type: string = '';
}

@Morph({
  inherits: {
    baseClass: PolyMain,
    discriminatorValue: 'A'
  }
})
class PolyA extends PolyMain {
  @Property()
  propA = 'a';
}

@Morph({
  inherits: {
    baseClass: PolyMain,
    discriminatorValue: 'B'
  }
})
class PolyB extends PolyMain {
  @Property()
  propB = 'b';
}

const m = getMorpherById(PolyMain);
// returns instance of PolyA
m.deserialize({type: 'A'})
// returns instance of PolyB
m.deserialize({type: 'B'})
```

## Excluding Properties in Serialization

The `@Morph` decorator supports `{ignoreProps: []}` -- each property in the list will be excluded from the serialized map.

## Semantics of Inheritance

The morpher will deserialize/serialize subclasses by applying the chain of ancestor definitions to an instance.

As an example, let's say we have `Person extends Animal (extends Organism)`. When deserializing, the `Person` instance will be created first, then the decorators are applied in this order: `[Organism, Animal, Person]` (this assumes each class defined its parent base in `@Morph`). When deserializing, the same decorator order is applied, with the following semantics:

- extract all relevant values with defined getters
- remove ignored props
- if child definition exists, deserialize child definition and merge into parent

What this basically means is if a parent ignores a property, the child can redefine and produce it, allowing deeper classes full control of final output if desired.
