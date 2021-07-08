/**
 * This example app shows how simple it is to get a fully working http server running. What to expect:
 *
 * - a TrivialService that returns some string
 * - an UploadController that:
 *   - responds to GET /upload?uploadId=NUMBER
 *   - responds to POST /upload and returns the string from TrivialService
 *   - authorization middleware that triggers error when header `throw-error: true` set
 *   - error handler that returns 500 with `{error: "errMsg"}`
 * - registering these services through their bundleIds retrieved from their entrypoint
 */
import { Dinoframe } from "../../dinoframe";
import { ExpressApp } from "../../http";
import { UploadController } from "./http-controllers";
import {ServiceContainer} from "../../service-container";
import {DecoratedServiceRecord} from "../../service-container/types";

/*
CONVENTION: each bundle's entrypoint is either:
1. a class that contains a static `discover(): string` returning its bundleId
2. a top-level `discover(): string` on a required module returning its bundleId

this has 2 advantages:
1. discover other dependencies within entrypoint
2. forces TS to process classes for decoration
 */
const dino = new Dinoframe([
  // provides express app and an http server binding to express
  ExpressApp.discover(),
  // example controller as a service
  UploadController.discover(),
  // a trivial service that the controller depends on
  require("./services").discover(),
  require("../../service-container/common/runtime").discover(),
  require("../../service-container/common/logging").discover()
]);

if (process.argv[2] == '--debug') {
  const status = ServiceContainer.analyzeDependencies(dino.getMetadataForBundles().map(c => new DecoratedServiceRecord(c)));
  for (const rec of status) {
    if (rec.status == 'RESOLVED') {
      console.log(`✅ ${rec.status} ${rec.id}`);
    } else if (rec.status == 'DISABLED') {
      console.log(`⚠️ ${rec.status} ${rec.id}`)
    } else {
      console.log(`🚫 ${rec.status} ${rec.id} -> ${rec.unresolvedDeps.join('; ')}`)
    }
  }
  process.exit();
}

// the only other bit of glue to trigger wiring and server start
dino
  .startup()
  .then(() => {
    console.log("started!");
    const app = dino.getHttpServer();
    app.listen(3000, () => {
      console.log("listening on 3000");
    });
  })
  .catch((e) => {
    console.error(e);
    console.error("- quitting");
    process.exit(1);
  });
console.log(`💡 if your app doesn't start as expected, re-run with --debug to see what dependencies are not resolved`)
