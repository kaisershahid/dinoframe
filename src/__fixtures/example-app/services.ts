import {BundleDecoratorFactory} from "../../decorator";
import {Service} from "../../service-container/decorators";

const ServiceBundle = BundleDecoratorFactory('example-app.services')

export const discover = () => {
    [TrivialService]
    return 'example-app.services'
}

@ServiceBundle
@Service('trivial')
export class TrivialService {
    getName() {
        return 'TrivialService!'
    }
}
