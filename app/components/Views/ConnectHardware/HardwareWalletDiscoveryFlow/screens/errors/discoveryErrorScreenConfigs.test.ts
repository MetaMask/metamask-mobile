import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import {
  DISCOVERY_ERROR_SCREEN_CONFIGS,
  DISCOVERY_ERROR_STEPS,
  getDiscoveryErrorScreenConfig,
  type DiscoveryErrorScreenVariant,
} from './discoveryErrorScreenConfigs';
import { DiscoveryStep } from '../../DiscoveryFlow.machine.types';

const CONFIG = DISCOVERY_ERROR_SCREEN_CONFIGS;
const ALL_VARIANTS: DiscoveryErrorScreenVariant[] = [
  ...DISCOVERY_ERROR_STEPS,
  'something-went-wrong',
];

describe('DISCOVERY_ERROR_STEPS', () => {
  it('contains all error step enum values', () => {
    expect(DISCOVERY_ERROR_STEPS).toHaveLength(8);
    expect(DISCOVERY_ERROR_STEPS).toEqual(
      expect.arrayContaining(
        Object.values(DiscoveryStep).filter(
          (s) =>
            ![
              'searching',
              'found',
              'not-found',
              'accounts',
              'permission-denied',
            ].includes(s),
        ),
      ),
    );
  });
});

describe('DISCOVERY_ERROR_SCREEN_CONFIGS', () => {
  it.each(ALL_VARIANTS)(
    'has a config with titleKey, subtitleKey, and testID for %s',
    (variant) => {
      const config = CONFIG[variant];
      expect(config.titleKey).toBeTruthy();
      expect(config.subtitleKey).toBeTruthy();
      expect(config.testID).toBeTruthy();
    },
  );

  describe('configs with static images', () => {
    it.each([
      DiscoveryStep.AppNotOpen,
      DiscoveryStep.BluetoothAccessDenied,
      DiscoveryStep.LocationAccessDenied,
      DiscoveryStep.NearbyDevicesDenied,
      DiscoveryStep.TransportUnavailable,
      DiscoveryStep.TransportConnectionFailed,
    ] as const)('has imageSource for %s', (step) => {
      expect(CONFIG[step].imageSource).toBeDefined();
      expect(CONFIG[step].rive).toBeUndefined();
    });

    it.each([
      DiscoveryStep.BluetoothAccessDenied,
      DiscoveryStep.LocationAccessDenied,
      DiscoveryStep.NearbyDevicesDenied,
      DiscoveryStep.TransportUnavailable,
    ] as const)('has open-settings and not-now buttons for %s', (step) => {
      expect(CONFIG[step].primaryButton?.role).toBe('open-settings');
      expect(CONFIG[step].secondaryButton?.role).toBe('not-now');
    });

    it.each([
      DiscoveryStep.DeviceUnresponsive,
      DiscoveryStep.AppNotOpen,
      DiscoveryStep.TransportConnectionFailed,
    ] as const)('has retry primary button for %s', (step) => {
      expect(CONFIG[step].primaryButton?.role).toBe('retry');
    });
  });

  describe('configs with rive animations', () => {
    it.each([
      { step: DiscoveryStep.DeviceUnresponsive, trigger: 'error' },
      { step: DiscoveryStep.DeviceLocked, trigger: 'ledger_locked' },
    ] as const)(
      'has rive config with $trigger state trigger for $step',
      ({ step, trigger }) => {
        expect(CONFIG[step].rive).toEqual({
          artboardName: 'Ledger',
          stateMachineName: 'Ledger_states',
          stateTrigger: trigger,
        });
      },
    );
  });

  describe('something-went-wrong config', () => {
    const genericConfig = CONFIG['something-went-wrong'];

    it('has continue primary and retry secondary buttons with custom label keys', () => {
      expect(genericConfig.primaryButton?.role).toBe('continue');
      expect(genericConfig.primaryButton?.labelKey).toBe(
        'hardware_wallet.error.continue',
      );
      expect(genericConfig.secondaryButton?.role).toBe('retry');
      expect(genericConfig.secondaryButton?.labelKey).toBe(
        'hardware_wallet.error.retry',
      );
    });

    it.each([
      { walletType: HardwareWalletType.Ledger, expected: 'Ledger' },
      { walletType: 'keystone' as HardwareWalletType, expected: 'device' },
    ])(
      'getSubtitleParams returns { device: "$expected" } for $walletType',
      ({ walletType, expected }) => {
        expect(genericConfig.getSubtitleParams?.(walletType)).toEqual({
          device: expected,
        });
      },
    );
  });
});

describe('getDiscoveryErrorScreenConfig', () => {
  it.each(ALL_VARIANTS)('returns the config for %s', (variant) => {
    expect(getDiscoveryErrorScreenConfig(variant)).toBe(CONFIG[variant]);
  });
});
