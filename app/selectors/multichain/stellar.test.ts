///: BEGIN:ONLY_INCLUDE_IF(stellar)
import { XlmAccountType, XlmScope } from '@metamask/keyring-api';
import { FeatureFlags } from '@metamask/remote-feature-flag-controller';
import { selectIsStellarChainVisible } from './stellar';
import { RootState } from '../../reducers';
import {
  createMockUuidFromAddress,
  MOCK_KEYRING_CONTROLLER_STATE,
} from '../../util/test/accountsControllerTestUtils';
import type { StellarAccountsFeatureFlag } from '../../multichain-stellar/remote-feature-flag';

const MOCK_STELLAR_ADDRESS =
  'GCEZWKCA5VNDSIX4BFMFNTGJTYZ4ZAQ7AN2K6QKWGAPMHUM7VHL53GI';

function mockStateWith({
  stellarAccounts,
  hasStellarAccount = false,
}: {
  stellarAccounts?: StellarAccountsFeatureFlag;
  hasStellarAccount?: boolean;
}) {
  const stellarAccountId = createMockUuidFromAddress(MOCK_STELLAR_ADDRESS);

  return {
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          cacheTimestamp: 0,
          remoteFeatureFlags: {
            ...(stellarAccounts !== undefined ? { stellarAccounts } : {}),
          } as unknown as FeatureFlags,
        },
        AccountsController: {
          internalAccounts: {
            accounts: hasStellarAccount
              ? {
                  [stellarAccountId]: {
                    address: MOCK_STELLAR_ADDRESS,
                    id: stellarAccountId,
                    scopes: [XlmScope.Pubnet],
                    metadata: {
                      name: 'Stellar Account 1',
                      importTime: 1684232000456,
                      keyring: {
                        type: 'Snap Keyring',
                      },
                    },
                    options: {},
                    methods: [],
                    type: XlmAccountType.Account,
                  },
                }
              : {},
            selectedAccount: hasStellarAccount ? stellarAccountId : undefined,
          },
        },
        KeyringController: MOCK_KEYRING_CONTROLLER_STATE,
      },
    },
  } as unknown as RootState;
}

describe('selectIsStellarChainVisible', () => {
  it('returns true when stellarAccounts flag is enabled', () => {
    const state = mockStateWith({
      stellarAccounts: {
        enabled: true,
        minimumVersion: '1.0.0',
      },
    });

    expect(selectIsStellarChainVisible(state)).toBe(true);
  });

  it('returns true when user has a Stellar account even if flag is disabled', () => {
    const state = mockStateWith({
      stellarAccounts: {
        enabled: false,
        minimumVersion: '1.0.0',
      },
      hasStellarAccount: true,
    });

    expect(selectIsStellarChainVisible(state)).toBe(true);
  });

  it('returns false when flag is disabled and user has no Stellar account', () => {
    const state = mockStateWith({
      stellarAccounts: {
        enabled: false,
        minimumVersion: '1.0.0',
      },
    });

    expect(selectIsStellarChainVisible(state)).toBe(false);
  });

  it('returns false when stellarAccounts flag is undefined and user has no Stellar account', () => {
    const state = mockStateWith({});

    expect(selectIsStellarChainVisible(state)).toBe(false);
  });
});
///: END:ONLY_INCLUDE_IF
