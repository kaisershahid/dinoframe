import {Dinoframe} from "../../index";
import {ExpressApp} from "../../http";
import {UploadController} from "./http-controllers";
import {TrivialService} from "./services";

// CONVENTION: each bundle's entrypoint contains a static `discover(): string` that returns its bundleId.
// this has 2 advantages:
// 1. forces TS to process the class and any other dependencies referenced in discover()
// 2. conveniently manages the bundleId for you
const dino = new Dinoframe([
    ExpressApp.discover(),
    UploadController.discover(),
    TrivialService.discover()
]);

dino.startup().then(() => {
    console.log('started!')
    const app = dino.getHttpServer();
    app.listen(3000, () => {
        console.log('listening on 3000');
    })
})
