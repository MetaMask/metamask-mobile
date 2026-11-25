import {
  getDeviceCapabilityOverride,
  setDeviceCapabilityOverride,
  type DeviceCapabilityOverride,
} from '../../../util/deviceCapability/override';

/** Runs a test with a scoped capability override; do not call in concurrent tests. */
export async function withNetworkConditions<Result>(
  override: DeviceCapabilityOverride,
  run: () => Result | Promise<Result>,
): Promise<Result> {
  const dev = __DEV__
    ? undefined
    : jest.replaceProperty(
        global as typeof global & Record<'__DEV__', boolean>,
        '__DEV__',
        true,
      );
  const previous = getDeviceCapabilityOverride();
  try {
    setDeviceCapabilityOverride(override);
    return await run();
  } finally {
    setDeviceCapabilityOverride(previous);
    dev?.restore();
  }
}
