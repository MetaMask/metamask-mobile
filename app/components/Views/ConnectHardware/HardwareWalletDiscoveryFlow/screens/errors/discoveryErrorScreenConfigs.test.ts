import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import {
  DISCOVERY_ERROR_SCREEN_CONFIGS,
  DISCOVERY_ERROR_STEPS,
  getDiscoveryErrorScreenConfig,
  type DiscoveryErrorScreenVariant,
} from './discoveryErrorScreenConfigs';
import { DiscoveryStep } from '../../DiscoveryFlow.machine.types';

describe('DISCOVERY_ERROR_STEPS', () => {
  it('contains all expected error steps', () => {
    expect(DISCOVERY_ERROR_STEPS).toContain(DiscoveryStep.DeviceUnresponsive);
    expect(DISCOVERY_ERROR_STEPS).toContain(DiscoveryStep.DeviceLocked);
    expect(DISCOVERY_ERROR_STEPS).toContain(DiscoveryStep.AppNotOpen);
    expect(DISCOVERY_ERROR_STEPS).toContain(
      DiscoveryStep.BluetoothAccessDenied,
    );
    expect(DISCOVERY_ERROR_STEPS).toContain(DiscoveryStep.LocationAccessDenied);
    expect(DISCOVERY_ERROR_STEPS).toContain(DiscoveryStep.NearbyDevicesDenied);
    expect(DISCOVERY_ERROR_STEPS).toContain(DiscoveryStep.TransportUnavailable);
    expect(DISCOVERY_ERROR_STEPS).toContain(
      DiscoveryStep.TransportConnectionFailed,
    );
  });

  it('has 8 error steps', () => {
    expect(DISCOVERY_ERROR_STEPS).toHaveLength(8);
  });
});

describe('DISCOVERY_ERROR_SCREEN_CONFIGS', () => {
  it('has a config for every discovery error step', () => {
    for (const step of DISCOVERY_ERROR_STEPS) {
      expect(DISCOVERY_ERROR_SCREEN_CONFIGS[step]).toBeDefined();
    }
  });

  it('has a config for the something-went-wrong variant', () => {
    expect(
      DISCOVERY_ERROR_SCREEN_CONFIGS['something-went-wrong'],
    ).toBeDefined();
  });

  it('every config has a titleKey, subtitleKey, and testID', () => {
    const variants: DiscoveryErrorScreenVariant[] = [
      ...DISCOVERY_ERROR_STEPS,
      'something-went-wrong',
    ];

    for (const variant of variants) {
      const config = DISCOVERY_ERROR_SCREEN_CONFIGS[variant];
      expect(config.titleKey).toBeTruthy();
      expect(config.subtitleKey).toBeTruthy();
      expect(config.testID).toBeTruthy();
    }
  });

  describe('configs with static images', () => {
    it('AppNotOpen has an imageSource and retry primary button', () => {
      const config = DISCOVERY_ERROR_SCREEN_CONFIGS[DiscoveryStep.AppNotOpen];
      expect(config.imageSource).toBeDefined();
      expect(config.primaryButton?.role).toBe('retry');
      expect(config.rive).toBeUndefined();
    });

    it('BluetoothAccessDenied has open-settings and not-now buttons', () => {
      const config =
        DISCOVERY_ERROR_SCREEN_CONFIGS[DiscoveryStep.BluetoothAccessDenied];
      expect(config.imageSource).toBeDefined();
      expect(config.primaryButton?.role).toBe('open-settings');
      expect(config.secondaryButton?.role).toBe('not-now');
    });

    it('LocationAccessDenied has open-settings and not-now buttons', () => {
      const config =
        DISCOVERY_ERROR_SCREEN_CONFIGS[DiscoveryStep.LocationAccessDenied];
      expect(config.imageSource).toBeDefined();
      expect(config.primaryButton?.role).toBe('open-settings');
      expect(config.secondaryButton?.role).toBe('not-now');
    });

    it('NearbyDevicesDenied has open-settings and not-now buttons', () => {
      const config =
        DISCOVERY_ERROR_SCREEN_CONFIGS[DiscoveryStep.NearbyDevicesDenied];
      expect(config.imageSource).toBeDefined();
      expect(config.primaryButton?.role).toBe('open-settings');
      expect(config.secondaryButton?.role).toBe('not-now');
    });

    it('TransportUnavailable has open-settings and not-now buttons', () => {
      const config =
        DISCOVERY_ERROR_SCREEN_CONFIGS[DiscoveryStep.TransportUnavailable];
      expect(config.imageSource).toBeDefined();
      expect(config.primaryButton?.role).toBe('open-settings');
      expect(config.secondaryButton?.role).toBe('not-now');
    });

    it('TransportConnectionFailed has a retry primary button', () => {
      const config =
        DISCOVERY_ERROR_SCREEN_CONFIGS[DiscoveryStep.TransportConnectionFailed];
      expect(config.imageSource).toBeDefined();
      expect(config.primaryButton?.role).toBe('retry');
    });
  });

  describe('configs with rive animations', () => {
    it('DeviceUnresponsive has rive config with error state trigger', () => {
      const config =
        DISCOVERY_ERROR_SCREEN_CONFIGS[DiscoveryStep.DeviceUnresponsive];
      expect(config.rive).toEqual({
        artboardName: 'Ledger',
        stateMachineName: 'Ledger_states',
        stateTrigger: 'error',
      });
      expect(config.imageSource).toBeUndefined();
    });

    it('DeviceLocked has rive config with ledger_locked state trigger', () => {
      const config = DISCOVERY_ERROR_SCREEN_CONFIGS[DiscoveryStep.DeviceLocked];
      expect(config.rive?.stateTrigger).toBe('ledger_locked');
      expect(config.secondaryButton?.role).toBe('retry');
    });
  });

  describe('something-went-wrong config', () => {
    it('has continue primary and retry secondary buttons', () => {
      const config = DISCOVERY_ERROR_SCREEN_CONFIGS['something-went-wrong'];
      expect(config.primaryButton?.role).toBe('continue');
      expect(config.primaryButton?.labelKey).toBe(
        'hardware_wallet.error.continue',
      );
      expect(config.secondaryButton?.role).toBe('retry');
      expect(config.secondaryButton?.labelKey).toBe(
        'hardware_wallet.error.retry',
      );
    });

    it('getSubtitleParams returns Ledger for Ledger wallet type', () => {
      const config = DISCOVERY_ERROR_SCREEN_CONFIGS['something-went-wrong'];
      const params = config.getSubtitleParams?.(HardwareWalletType.Ledger);
      expect(params).toEqual({ device: 'Ledger' });
    });

    it('getSubtitleParams returns device for non-Ledger wallet type', () => {
      const config = DISCOVERY_ERROR_SCREEN_CONFIGS['something-went-wrong'];
      const params = config.getSubtitleParams?.(
        'keystone' as HardwareWalletType,
      );
      expect(params).toEqual({ device: 'device' });
    });
  });
});

describe('getDiscoveryErrorScreenConfig', () => {
  it('returns the config for a given variant', () => {
    const config = getDiscoveryErrorScreenConfig(DiscoveryStep.DeviceLocked);
    expect(config).toBe(
      DISCOVERY_ERROR_SCREEN_CONFIGS[DiscoveryStep.DeviceLocked],
    );
  });

  it('returns the config for something-went-wrong', () => {
    const config = getDiscoveryErrorScreenConfig('something-went-wrong');
    expect(config).toBe(DISCOVERY_ERROR_SCREEN_CONFIGS['something-went-wrong']);
  });

  it.each([
    DiscoveryStep.DeviceUnresponsive,
    DiscoveryStep.DeviceLocked,
    DiscoveryStep.AppNotOpen,
    DiscoveryStep.BluetoothAccessDenied,
    DiscoveryStep.LocationAccessDenied,
    DiscoveryStep.NearbyDevicesDenied,
    DiscoveryStep.TransportUnavailable,
    DiscoveryStep.TransportConnectionFailed,
    'something-went-wrong' as DiscoveryErrorScreenVariant,
  ])('returns config with testID for variant %s', (variant) => {
    const config = getDiscoveryErrorScreenConfig(variant);
    expect(config.testID).toBeTruthy();
  });
});
