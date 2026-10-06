import { createStateFixture } from '../stateFixture';
import type {
  CollectorCryptCard,
  PackOperation,
} from '../../../app/components/UI/Gacha/providers/collector-crypt/types';
import { SOLANA_USDC_ASSET_ID } from '../../../app/components/UI/Gacha/providers/collector-crypt/constants';
import {
  MOCK_ACCOUNT,
  MOCK_INTERNAL_ACCOUNT,
} from '../../../app/components/UI/Gacha/views/testUtils';

export interface InitialStateGachaOptions {
  cards?: CollectorCryptCard[];
  operations?: PackOperation[];
  usdcAmount?: string;
  hasSolanaAccount?: boolean;
  hasCompletedOnboarding?: boolean;
  isEnabled?: boolean;
}

/** Minimal shared state for Gacha screens, with a real selected account group. */
export const initialStateGacha = ({
  cards = [],
  operations = [],
  usdcAmount = '100',
  hasSolanaAccount = true,
  hasCompletedOnboarding = true,
  isEnabled = true,
}: InitialStateGachaOptions = {}) => {
  const builder = createStateFixture()
    .withMinimalAccounts()
    .withRemoteFeatureFlags({
      gachaEnabled: { enabled: isEnabled, minimumVersion: '0.0.0' },
    })
    .withOverrides({
      engine: {
        backgroundState: {
          GachaController: {
            hasCompletedOnboarding,
            collectorCrypt: {
              cards: {
                [MOCK_ACCOUNT.address]: Object.fromEntries(
                  cards.map((card) => [card.mint, card]),
                ),
              },
              operations: {
                [MOCK_ACCOUNT.address]: Object.fromEntries(
                  operations.map((operation) => [operation.memo, operation]),
                ),
              },
            },
          },
          AssetsController: {
            assetsBalance: {
              [MOCK_ACCOUNT.id]: {
                [SOLANA_USDC_ASSET_ID]: { amount: usdcAmount },
              },
            },
          },
        },
      },
    });
  if (hasSolanaAccount) {
    builder.withOverrides({
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: { [MOCK_ACCOUNT.id]: MOCK_INTERNAL_ACCOUNT },
              selectedAccount: MOCK_ACCOUNT.id,
            },
          },
        },
      },
    });
  }
  return builder.withAccountTreeForSelectedAccount();
};
