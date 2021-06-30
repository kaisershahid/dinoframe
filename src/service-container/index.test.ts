import {Agent} from "./__fixtures/services";
import {getDecoratedServiceRecords} from "./decorators";
import {ServiceContainerWrapper} from "./index";

describe('module: service-container', () => {
    describe('ServiceContainerWrapper thru fixture services', () => {
        Agent.discover();
        const serviceRecs = getDecoratedServiceRecords();
        const subject = new ServiceContainerWrapper();
        serviceRecs.forEach(r => subject.register(r));

        it('loads', async () =>{
            await subject.startup();
            const agent = subject.resolve<Agent>('agent');
            expect(agent.getRoleCall().length).toEqual(2);
        })
    })
})
