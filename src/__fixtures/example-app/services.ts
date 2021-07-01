import {BundleDecoratorFactory} from "../../decorator";
import {Service} from "../../service-container/decorators";

const ServiceBundle = BundleDecoratorFactory('example-app.services')

@ServiceBundle
@Service('trivial')
export class TrivialService {
    getName() {
        return 'TrivialService!'
    }

    static discover() {
        return 'example-app.services'
    }
}
