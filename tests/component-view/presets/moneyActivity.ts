import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import type { CardCashbackClaim } from '../../../app/core/Engine/controllers/card-controller/types';
import type { Json } from '@metamask/utils';
import { createStateFixture } from '../stateFixture';
import {
  MONAD_MAINNET_CHAIN_ID,
  MONAD_VAULT,
  MONEY_TEST_ACCOUNT_ADDRESS,
  MONEY_TEST_KEYRING_ID,
  moneyAccount,
  withMoneyAccountOverrides,
} from './moneyAccount';

export const MONEY_ACTIVITY_ACCOUNT = MONEY_TEST_ACCOUNT_ADDRESS;
export const MONEY_ACTIVITY_KEYRING_ID = MONEY_TEST_KEYRING_ID;
export const MONEY_STANDARD_VAULT = MONAD_VAULT;

export const MONEY_PREMIUM_VAULT = {
  chainId: MONAD_MAINNET_CHAIN_ID,
  boringVault: '0xBFeC8c2b1ccea3931a1363E4CaC27352c1C908B7',
  tellerAddress: '0x2D49EA58A4C70b62c8B56DE971310d9e999c8117',
  accountantAddress: '0x7382c5b8B51B8C4f127B3123C1039581BAA5A06B',
  lensAddress: '0xA816ECd922de94c6879AD23B9A884dB257F20947',
  underlyingToken: '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
} as const;

export function moneyActivityViewState({
  historicalValuationsEnabled,
  cashbackClaim = null,
}: {
  historicalValuationsEnabled: boolean;
  cashbackClaim?: CardCashbackClaim | null;
}): DeepPartial<RootState> {
  const account = moneyAccount();
  const moneyOverrides = withMoneyAccountOverrides(account, {
    includeGeolocation: true,
  });
  const overrides: DeepPartial<RootState> = { ...moneyOverrides };

  if (cashbackClaim) {
    overrides.engine = {
      ...moneyOverrides.engine,
      backgroundState: {
        ...moneyOverrides.engine.backgroundState,
        CardController: {
          cashbackClaim: cashbackClaim as unknown as Record<
            string,
            Json
          > | null,
        },
      },
    };
  }

  return createStateFixture()
    .withMinimalAccounts()
    .withPreferences({ privacyMode: false })
    .withMinimalMainnetNetwork()
    .withMinimalKeyringController()
    .withMinimalAnalyticsController()
    .withAccountTreeForSelectedAccount()
    .withRemoteFeatureFlags({
      moneyEnableMoneyAccount: {
        enabled: true,
        minimumVersion: '0.0.0',
      },
      moneyEnableActivityDetails: {
        enabled: true,
        minimumVersion: '0.0.0',
      },
      moneyEnableHistoricalVaultShareValuations: {
        enabled: historicalValuationsEnabled,
        minimumVersion: '0.0.0',
      },
      moneyAccountVaultConfig: MONEY_STANDARD_VAULT,
      moneyAccountPremiumVaultConfig: MONEY_PREMIUM_VAULT,
    })
    .withOverrides(overrides)
    .build();
}
