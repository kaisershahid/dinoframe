import {getMorpherById, Morph, Property, PropertyGet, PropertySet} from "./decorators";
import {Morpher} from "./index";

describe('module: morph', () => {
  describe('Morpher inheritance', () => {
    @Morph({ignoreProps: ['propAExclude']})
    class A {
      @Property() propA = '';
      @Property() propAExclude = 'excluded'
    }

    @Morph({inherits: {baseClass: A}})
    class B extends A {
      @Property() propB = '';
      @Property() propBExcludable = 'hello';
    }

    @Morph({inherits: {baseClass: B}, ignoreProps: ['propBExcludable']})
    class C extends B {
      @Property() propC = '';
      @Property() propAExcluded = 'notExcludedInC'
    }

    const srcValid = {propA: 'a1', propB: 'b2', propC: 'c3'};
    const morpher: Morpher = getMorpherById(C) as any;

    it('properly applies ancestor decorators on deserialization', () => {
      const inst = morpher.deserialize<C>(srcValid);
      expect(inst.propC).toEqual('c3');
      expect(inst.propB).toEqual('b2');
      expect(inst.propA).toEqual('a1');
    })

    // asserts: top-level property can be excluded by child
    // asserts: child can include a previously excluded top-level property
    it('properly applies ancestor decorators on serialization', () => {
      const inst = morpher.deserialize<C>(srcValid);
      const map = morpher.serialize(inst);
      expect(map).toEqual({...srcValid, propAExcluded: 'notExcludedInC'});
    })
  })

  describe('Morpher polymorphic subclassing (agaist MorphPoly)', () => {
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
    const t = getMorpherById(MorphPoly) as Morpher;

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
      expect(t.serialize(instB)).toEqual({
        name: 'B-instB',
        type: 'typeB',
        propB: '',
        ignorable: 'notIgnoredInB'
      });
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
})
