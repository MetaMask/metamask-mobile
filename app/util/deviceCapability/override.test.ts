import { parseDeviceCapabilityOverride } from './override';

describe('parseDeviceCapabilityOverride', () => {
  it('reads supported tiers', () => {
    const result = parseDeviceCapabilityOverride(
      'hardware=LOW,network=SLOW_CELLULAR,latency=SLOW',
    );

    expect(result).toEqual({
      hardware: 'LOW',
      network: 'SLOW_CELLULAR',
      latency: 'SLOW',
    });
  });

  it.each([
    undefined,
    'hardware=large,network=4g,latency=OK=extra,unknown=LOW',
  ])('ignores unsupported overrides: %s', (input) => {
    const result = parseDeviceCapabilityOverride(input);

    expect(result).toEqual({});
  });
});

describe('setDeviceCapabilityOverride', () => {
  it('ignores environment and setter overrides in production', () => {
    const dev = jest.replaceProperty(
      global as typeof global & { __DEV__: boolean },
      '__DEV__',
      false,
    );
    const envKey = 'MM_DEVICE_CAPABILITY_OVERRIDE';
    const oldEnv = process.env[envKey];
    process.env[envKey] = 'hardware=LOW,network=NONE,latency=SLOW';

    try {
      jest.isolateModules(() => {
        const {
          getDeviceCapabilityOverride,
          setDeviceCapabilityOverride,
          subscribeDeviceCapabilityOverride,
        } = jest.requireActual<typeof import('./override')>('./override');
        const listener = jest.fn();
        const unsubscribe = subscribeDeviceCapabilityOverride(listener);

        setDeviceCapabilityOverride({
          hardware: 'LOW',
          network: 'NONE',
          latency: 'SLOW',
        });

        expect(getDeviceCapabilityOverride()).toEqual({});
        expect(listener).not.toHaveBeenCalled();
        unsubscribe();
      });
    } finally {
      dev.restore();
      if (oldEnv === undefined) delete process.env[envKey];
      else process.env[envKey] = oldEnv;
    }
  });
});
