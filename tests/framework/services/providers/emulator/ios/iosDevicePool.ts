const IOS_SIMULATOR_UDID_PATTERN =
  /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/;
export const WDA_LOCAL_PORT_BASE = 8100;
export const MJPEG_SERVER_PORT_BASE = 9100;

export interface IosWorkerDevice {
  udid: string;
  wdaLocalPort: number;
  mjpegServerPort: number;
}

/**
 * Resolve the requested simulator count, defaulting to the historical single
 * simulator path.
 */
export function resolveIosDevicePoolSize(
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = env.IOS_DEVICE_POOL_SIZE?.trim() || '1';
  const poolSize = Number(raw);
  if (!Number.isInteger(poolSize) || poolSize < 1) {
    throw new Error(
      `Invalid IOS_DEVICE_POOL_SIZE "${raw}". Expected a positive integer.`,
    );
  }
  return poolSize;
}

/**
 * Pool mode requires one Playwright worker per simulator. Playwright reads its
 * worker count before global setup, so changing E2E_WORKERS during boot cannot
 * repair a mismatch.
 */
export function assertIosDevicePoolMatchesWorkers(
  env: Record<string, string | undefined> = process.env,
): void {
  const poolSize = resolveIosDevicePoolSize(env);
  const rawWorkers = env.E2E_WORKERS?.trim() || '1';
  const workers = Number(rawWorkers);
  if (!Number.isInteger(workers) || workers < 1) {
    throw new Error(
      `Invalid E2E_WORKERS "${rawWorkers}". Expected a positive integer.`,
    );
  }
  if ((poolSize > 1 || workers > 1) && poolSize !== workers) {
    throw new Error(
      `IOS_DEVICE_POOL_SIZE (${poolSize}) must match E2E_WORKERS (${workers}) in pool mode.`,
    );
  }
}

/**
 * Name a cloned CoreSimulator device for a worker slot.
 */
export function iosPoolSimulatorName(
  baseName: string,
  workerIndex: number,
): string {
  return `${baseName} Appium Pool ${workerIndex}`;
}

/**
 * Parse the ordered UDID list exported by iOS pool setup.
 */
export function parseIosDevicePool(rawPool: string | undefined): string[] {
  if (!rawPool?.trim()) {
    return [];
  }

  const udids = rawPool
    .split(',')
    .map((udid) => udid.trim())
    .filter(Boolean);
  const seen = new Set<string>();

  for (const udid of udids) {
    if (!IOS_SIMULATOR_UDID_PATTERN.test(udid)) {
      throw new Error(
        `IOS_DEVICE_POOL contains invalid simulator UDID "${udid}".`,
      );
    }
    if (seen.has(udid)) {
      throw new Error(
        `IOS_DEVICE_POOL contains duplicate UDID "${udid}".`,
      );
    }
    seen.add(udid);
  }

  return udids;
}

/**
 * Ordered simulator UDIDs for the configured pool, or an empty list on the
 * single simulator path. iOS UDIDs are never synthesized from pool size.
 */
export function iosDevicePoolUdids(
  env: Record<string, string | undefined> = process.env,
): string[] {
  return parseIosDevicePool(env.IOS_DEVICE_POOL);
}

/**
 * Resolve the fixed iOS simulator and WDA ports for a worker slot.
 * Returns undefined when pool mode is not configured, preserving the single
 * simulator path.
 */
export function deviceForWorker(
  workerIndex: number,
  env: Record<string, string | undefined> = process.env,
): IosWorkerDevice | undefined {
  const poolSize = resolveIosDevicePoolSize(env);
  const udids = iosDevicePoolUdids(env);

  if (udids.length === 0) {
    if (poolSize > 1) {
      throw new Error(
        `IOS_DEVICE_POOL_SIZE (${poolSize}) requires IOS_DEVICE_POOL with ${poolSize} UDIDs. iOS simulator UDIDs cannot be derived from pool size.`,
      );
    }
    return undefined;
  }

  if (poolSize > 1 && udids.length !== poolSize) {
    throw new Error(
      `IOS_DEVICE_POOL_SIZE (${poolSize}) requires IOS_DEVICE_POOL with ${poolSize} UDIDs. iOS simulator UDIDs cannot be derived from pool size.`,
    );
  }

  const udid = udids[workerIndex];
  if (!udid) {
    throw new Error(
      `iOS worker ${workerIndex} has no device in IOS_DEVICE_POOL (${udids.length} devices).`,
    );
  }

  return {
    udid,
    wdaLocalPort: WDA_LOCAL_PORT_BASE + workerIndex,
    mjpegServerPort: MJPEG_SERVER_PORT_BASE + workerIndex,
  };
}

/**
 * Export a worker's fixed iOS assignment for CoreSimulator and Appium.
 */
export function applyIosDevicePoolToWorker(
  workerIndex: number,
  env: Record<string, string | undefined> = process.env,
): IosWorkerDevice | undefined {
  const assignment = deviceForWorker(workerIndex, env);
  if (!assignment) {
    return undefined;
  }

  env.IOS_SIMULATOR_UDID = assignment.udid;
  env.E2E_WORKER_INDEX = String(workerIndex);
  env.IOS_WDA_LOCAL_PORT = String(assignment.wdaLocalPort);
  env.IOS_MJPEG_SERVER_PORT = String(assignment.mjpegServerPort);
  return assignment;
}
