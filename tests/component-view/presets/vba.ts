import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { MONEY_MOVEMENT_NEOBANK_FLAG_KEY } from '../../../app/selectors/featureFlagController/moneyAccount';
import { initialStateWallet } from './wallet';

interface InitialStateVbaOptions {
  location?: string;
  flagEnabled?: boolean;
}

/**
 * State shared by VBA entry points and onboarding screens.
 * The default represents an eligible Brazilian user.
 */
export const initialStateVba = ({
  location = 'BR',
  flagEnabled = true,
}: InitialStateVbaOptions = {}) =>
  initialStateWallet()
    .withRemoteFeatureFlags({
      [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: {
        enabled: flagEnabled,
        minimumVersion: '0.0.0',
        regions: ['BR'],
        regionCurrencies: { BR: 'BRL' },
      },
    })
    .withOverrides({
      engine: {
        backgroundState: {
          GeolocationController: {
            location,
            status: 'complete',
          },
          RampsController: {
            autoramps: [],
          },
        },
      },
    } as unknown as DeepPartial<RootState>);
