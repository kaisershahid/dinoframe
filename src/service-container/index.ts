import {
  DecoratedServiceRecord,
  DependencyMeta,
  InjectableList,
  Container,
  ServiceRecord,
  ServiceState,
  FactoryContainer,
} from "./types";
import {Logger, LoggerFactory, LoggerLevel} from "./common/logging";

export const PROVIDER_ID = "service-container";

/**
 * Keeps track of an individual service's dependencies. Await `ServiceTracker.promise` to
 * get notified of start (returns the service id).
 */
export class ServiceTracker {
  id: string;
  depServices: Record<string, any> = {};
  depInterfaces: Record<string, any> = {};
  promise: Promise<string>;
  resolve: (value?: PromiseLike<any> | any) => void = (v) => {};
  reject: (reason?: any) => void = (v) => {};

  constructor(id: string) {
    this.id = id;
    this.promise = new Promise((res, rej) => {
      this.resolve = res;
      this.reject = rej;
    });
  }

  isSatisfied() {
    return (
      Object.keys(this.depServices).length == 0 &&
      Object.keys(this.depInterfaces).length == 0
    );
  }
}

export const canActivateService = (status: ServiceState) =>
  status < ServiceState.activating || status > ServiceState.deactivating;
export const canDeactivateService = (status: ServiceState) =>
  status == ServiceState.activated;

const lf = LoggerFactory.getSingleton();
const logger = lf.getLogger("service-container");
const dtLogger = lf.getLogger("service-container.deptrack");

/**
 * Manages dependency tracking for entire container.
 */
export class DependencyTracker {
  /**
   * key: the serviceId required; value: a map of serviceIds waiting
   */
  waitingOnService: Record<string, Record<string, any>> = {};
  /**
   * key: the interface required; value: a map of serviceIds -> DependencyMeta
   */
  waitingOnInterface: Record<string, Record<string, DependencyMeta>> = {};
  interfaceCount: Record<string, number> = {};
  serviceMap: Record<string, any> = {};
  serviceTrackers: Record<string, ServiceTracker> = {};

  getTracker(id: string): ServiceTracker {
    if (!this.serviceTrackers[id]) {
      this.serviceTrackers[id] = new ServiceTracker(id);
    }
    return this.serviceTrackers[id];
  }

  waitOnService(dependencyId: string, dependentId: string) {
    // @todo figure out why this is happening!
    if (!this.waitingOnService[dependencyId]) {
      this.waitingOnService[dependencyId] = {};
    }

    this.waitingOnService[dependencyId][dependentId] = 1;
    this.getTracker(dependentId).depServices[dependencyId] = true;
    dtLogger.info(`waitOnService: ${dependentId} -> ${dependencyId}`);
  }

  waitOnInterface(
    interfaze: string,
    waitingId: string,
    depMeta: DependencyMeta
  ) {
    if (!this.waitingOnInterface[interfaze]) {
      this.waitingOnInterface[interfaze] = {};
    }
    this.waitingOnInterface[interfaze][waitingId] = depMeta;
    this.getTracker(waitingId).depInterfaces[interfaze] = true;
    dtLogger.info(`waitOnInterface: ${waitingId} -> ${interfaze}`);
  }

  serviceAvailable(id: string) {
    if (!this.waitingOnService[id]) {
      dtLogger.info(`serviceAvailable: ${id} -> NO_WAITING_DEPS`);
      return [];
    }

    this.serviceMap[id] = 1;
    const notify = Object.keys(this.waitingOnService[id]);
    dtLogger.info(`serviceAvailable: ${id} ->`, notify);
    delete this.waitingOnService[id];
    for (const sid of notify) {
      delete this.serviceTrackers[sid].depServices[id];
    }
    return notify;
  }

  interfaceAvailable(interfaze: string) {
    if (!this.waitingOnInterface[interfaze]) {
      dtLogger.info(`interfaceAvailable: ${interfaze} -> NO_WAITING_DEPS`);
      return [];
    }

    if (!this.interfaceCount[interfaze]) {
      this.interfaceCount[interfaze] = 0;
    }
    this.interfaceCount[interfaze]++;

    const notify: string[] = [];
    for (const waitId of Object.keys(this.waitingOnInterface[interfaze])) {
      const depMeta = this.waitingOnInterface[interfaze][waitId];
      const min = depMeta.matchCriteria?.min ?? 1;
      if (this.interfaceCount[interfaze] >= min) {
        delete this.waitingOnInterface[interfaze][waitId];
        delete this.serviceTrackers[waitId].depInterfaces[interfaze];
        notify.push(waitId);
      }
    }

    dtLogger.info(`serviceAvailable: ${interfaze} ->`, notify);

    return notify;
  }

  bindToInterface(
    interfaze: string,
    dependentId: string,
    depMeta: DependencyMeta
  ) {
    const min =
      depMeta.matchCriteria?.min === undefined ? 1 : depMeta.matchCriteria.min;
    if ((this.interfaceCount[interfaze] ?? 0) < min) {
      this.waitOnInterface(interfaze, dependentId, depMeta);
    } else {
      dtLogger.info(`bindToInterface: ${dependentId} -> ${interfaze}`);
    }
  }

  bindToService(dependencyId: string, dependentId: string) {
    if (!this.serviceMap[dependencyId]) {
      const [subId, factoryId] = dependencyId.split("@");
      this.waitOnService(factoryId ?? dependencyId, dependentId);
    } else {
      dtLogger.info(`bindToService: ${dependentId} -> ${dependencyId}`);
    }
  }
}

export class ServiceFactoryHelper implements FactoryContainer {
  private container: ServiceContainer;

  constructor(container: ServiceContainer) {
    this.container = container;
  }

  has(id: string): boolean {
    const [subId, factoryId] = id.split("@");
    this.assertIsFactory(factoryId);
    if (!this.container.has(factoryId)) {
      return false;
    }

    return this.container.resolve<FactoryContainer>(factoryId).has(subId);
  }

  resolve<T>(id: string): T {
    const [subId, factoryId] = id.split("@");
    this.assertIsFactory(factoryId);
    const svc = this.container
      .resolve<FactoryContainer>(factoryId)
      .resolve(subId);
    if (!svc) {
      throw new Error(`${id}: service not found`);
    }
    return svc;
  }

  private assertIsFactory(id: string) {
    if (!this.container.isFactory(id)) {
      throw new Error(`${id}: not a factory`)
    }
  }
}

export class ServiceContainer implements Container {
  private records: Record<string, ServiceRecord> = {};
  private instances: Record<string, any> = {};
  private recordsById: Record<string, number> = {};
  private recordsByGid: Record<string, string> = {};
  private interfaceToRec: Record<string, string[]> = {};
  private started: boolean = false;
  private depTracker: DependencyTracker = new DependencyTracker();
  private factoryHelper: ServiceFactoryHelper;
  private logger: Logger;

  constructor(initialRecords: DecoratedServiceRecord[] = []) {
    initialRecords.forEach((r) => this.register(r));
    this.factoryHelper = new ServiceFactoryHelper(this);
    this.logger = logger;
  }

  has(id: string) {
    if (id.includes("@")) {
      return this.factoryHelper.has(id);
    }

    return this.instances[id] !== undefined;
  }

  hasGid(gid: string) {
    return this.has(this.records[this.recordsByGid[gid]]?.id);
  }

  resolve<T extends any = any>(id: string): T {
    if (id.includes("@")) {
      return this.factoryHelper.resolve<T>(id);
    }

    if (!this.has(id)) {
      throw new Error(`${id}: service not found`); // @todo specific error
    }

    return this.instances[id] as T;
  }

  resolveGid<T extends any = any>(gid: string): T {
    const id = this.recordsByGid[gid];
    return this.resolve<T>(id);
  }

  /**
   * Returns instances matching interface in high-to-low priority order.
   */
  query<T extends any = any>(matchInterface: string): T[] {
    if (!this.interfaceToRec[matchInterface]) {
      return [];
    }
    const services: [number, T][] = [];

    this.interfaceToRec[matchInterface].forEach((idx) => {
      const rec = this.records[idx];
      const id = rec.id;
      if (this.has(id)) {
        services.push([rec.priority, this.resolve(id)]);
      }
    });

    return services
      .sort(([p1], [p2]) => {
        if (p1 < p2) return 1;
        else if (p1 > p2) return -1;
        return 0;
      })
      .map(([p, inst]) => inst);
  }

  register(metadata: DecoratedServiceRecord) {
    if (this.recordsById[metadata.id]) {
      return;
    }

    this.records[metadata.id] = metadata;
    this.recordsByGid[metadata.gid] = metadata.id;
    metadata.interfaces.forEach((int) => {
      if (!this.interfaceToRec[int]) {
        this.interfaceToRec[int] = [];
      }
      this.interfaceToRec[int].push(metadata.id);
    });

    if (this.started) {
      // @todo immediate start
    }
  }

  async startup(): Promise<Container> {
    if (this.started) {
      return this;
    }

    const recs = Object.values(this.records).sort(
      ({ priority: p1 }, { priority: p2 }) => {
        return p1 < p2 ? 1 : p1 > p2 ? -1 : 0;
      }
    );

    const promises: Promise<any>[] = [];
    for (const rec of recs) {
      if (rec.disabled || !canActivateService(rec.status)) {
        continue;
      }
      promises.push(
        this.initServiceFromRecord(rec).then((inst) => {
          rec.status = ServiceState.activated;
          this.logger.info(`! startup: ${rec.id} AVAILABLE`);
          const notifyServices = this.depTracker.serviceAvailable(rec.id);
          const interfaces: string[] = [];
          const notifyInterfaces = rec.interfaces
            .map((int) => {
              interfaces.push(int);
              return this.depTracker.interfaceAvailable(int);
            })
            .reduce((a, b) => a.concat(b), []);

          this.wakeUpDependents(notifyServices.concat(notifyInterfaces));
          // @todo notify subscribers for interfaces
        })
      );
    }

    // @todo need audit trail of service start/stop
    // @todo need dashboard data for all services

    this.started = true;
    await Promise.all(promises);
    return this;
  }

  protected async initServiceFromRecord(rec: ServiceRecord): Promise<any> {
    const tracker = this.depTracker.getTracker(rec.id);
    return this.waitOnDependencies(rec, tracker).then(async (serviceId) => {
      const inst = this.makeInstance(rec);
      this.instances[rec.id] = inst;
      this.processInjections(rec, inst);
      return this.activateService(rec, inst).then(() => inst);
    });
  }

  private async waitOnDependencies(
    rec: ServiceRecord,
    tracker: ServiceTracker
  ) {
    const deps = Object.keys(rec.dependencies);
    this.logger.info(
      `waitOnDependencies: ${rec.id} ->`, deps.length > 1 ? deps : 'NO_DEPS'
    );
    for (const dep of deps) {
      if (dep.startsWith("#")) {
        const interfaze = dep.substring(1);
        const matchCriteria = rec.dependencies[dep];
        this.depTracker.bindToInterface(interfaze, rec.id, { matchCriteria });
      } else {
        // unlike a normal service ref, a factory service ref should only depend on the root factory
        // and not a specific sub-service -- this is because sub-services have unknown cardinality.
        // we could work in extra checks to force creation of required sub-services once factory is
        // available, but for now using this approach
        const [subId, factoryId] = dep.split("@");
        this.depTracker.bindToService(factoryId ? factoryId : dep, rec.id);
      }
    }

    const st = this.depTracker.getTracker(rec.id);
    if (st.isSatisfied()) {
      st.resolve(rec.id);
    }

    return st.promise;
  }

  private wakeUpDependents(depIds: string[]) {
    const visited: Record<string, boolean> = {};
    for (const depId of depIds) {
      if (visited[depId]) continue;
      visited[depId] = true;
      const st = this.depTracker.getTracker(depId);
      if (st.isSatisfied()) {
        this.logger.info(`. wakeUpDependents: ${depId} RESOLVED`);
        st.resolve(depId);
      }
    }
  }

  async shutdown(): Promise<Container> {
    if (!this.started) {
      throw new Error("serviceContainer not started");
    }

    const promises: Promise<any>[] = [];
    for (const rec of Object.values(this.records)) {
      if (rec.disabled || canDeactivateService(rec.status)) {
        continue;
      }
      promises.push(
        this.deactivateService(rec, this.instances[rec.id])
          .catch((e) => {
            this.logger.error(`failed to successfully deactivate: ${rec.id}`, e);
          })
          .finally(() => {
            delete this.instances[rec.id];
            rec.status = ServiceState.deactivated;
          })
      );
    }

    this.started = false;
    return this;
  }

  protected makeInstance(rec: ServiceRecord): any {
    const clazz = rec.clazz;
    const config = rec.injectConfig
      ? this.resolve(rec.injectConfig)
      : undefined;
    if (rec.factory) {
      if (config) {
        return clazz[rec.factory](
          config,
          ...this.getDependenciesAsArgs(rec.injectableFactory)
        );
      } else {
        return clazz[rec.factory](
          ...this.getDependenciesAsArgs(rec.injectableFactory)
        );
      }
    } else if (config) {
      return new clazz(config);
    } else {
      return new clazz();
    }
  }

  protected processInjections(rec: ServiceRecord, inst: any) {
    for (const methodName of Object.keys(rec.injectableMethods)) {
      inst[methodName](
        ...this.getDependenciesAsArgs(rec.injectableMethods[methodName])
      );
    }
  }

  getDependenciesAsArgs(injectable: InjectableList): any[] {
    const args = injectable.map((dep) => {
      if (!dep) {
        return;
      } else if (dep.id) {
        return this.resolve(dep.id);
      } else if (dep.matchInterface) {
        const svcs = this.query(dep.matchInterface);
        return svcs;
      }
    });
    return args;
  }

  protected async activateService(rec: ServiceRecord, inst: any) {
    if (rec.activator) {
      return Promise.resolve(inst[rec.activator]());
    }
  }

  protected async deactivateService(rec: ServiceRecord, inst: any) {
    // @todo deactivate dependents of rec.id
    if (rec.deactivator) {
      return Promise.resolve(inst[rec.deactivator]());
    }
  }

  isFactory(factoryId: string) {
    return !!this.records[factoryId].isFactory;
  }
}
