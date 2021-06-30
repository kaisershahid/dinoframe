import {Agent} from "./__fixtures/services";
import {getDecoratedServiceRecords} from "./decorators";
import {ServiceContainer} from "./index";

describe('module: service-container', () => {
    describe('ServiceContainer thru fixture services', () => {
        // 1. call discover on all the top-level classes or entry points of the module(s) you want to wire. this has to do with how/when JS processes the class
        //    simply importing it won't do it -- something somewhere needs to concretely reference a class member for JS engine to parse it and its decorators
        Agent.discover();
        // 2. retrieves ALL the annotated classes
        const serviceRecs = getDecoratedServiceRecords();
        // 3. initial container with records
        const subject = new ServiceContainer(serviceRecs);

        it('loads all expected services in priority order and invokes @Activate appropriately', async () => {
            // 4. finally, start up container boot
            await subject.startup();
            const agent = subject.resolve<Agent>('agent');
            const roleCall = agent.getRoleCall();
            expect(roleCall.length).toEqual(2);
            expect(roleCall[0]).toEqual("my name is gob wake and i'm a magician")
            expect(roleCall[1]).toEqual("my name is tobias and i'm a actor")
        });
    })
})
