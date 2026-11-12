import { createStateFixture } from '../stateFixture';
import {
  serveBuybackOffers,
  serveOwnedCards,
} from '../fixtures/collectibles-data-services';
import type {
  CollectiblesBuybackOperation,
  CollectiblesBuyback,
  CollectiblesCard,
  CollectiblesPackOperation,
} from '../../../app/components/UI/Collectibles/types';
import { SOLANA_USDC_ASSET_ID } from '../../../app/components/UI/Collectibles/providers/pack-partner/constants';
import {
  MOCK_ACCOUNT,
  MOCK_INTERNAL_ACCOUNT,
} from '../../../app/components/UI/Collectibles/views/testUtils';

export interface InitialStateCollectiblesOptions {
  /** Cards PackPartner reports for MOCK_ACCOUNT (`getOwnedCards`). */
  ownedCards?: CollectiblesCard[];
  /** PackPartner's current offers by mint (`getBuybackOffer`). */
  offers?: Record<string, CollectiblesBuyback>;
  /** Purchase journal of MOCK_ACCOUNT. */
  operations?: CollectiblesPackOperation[];
  /** Buyback journal of MOCK_ACCOUNT. */
  sales?: CollectiblesBuybackOperation[];
  usdcAmount?: string;
  hasSolanaAccount?: boolean;
  hasCompletedOnboarding?: boolean;
  isEnabled?: boolean;
}

/**
 * Minimal shared state for Collectibles screens, with a real selected account
 * group. The controller state only holds the operation journal; the owned
 * cards and offers are served as PackPartner reads.
 */
export const initialStateCollectibles = ({
  ownedCards = [],
  offers = {},
  operations = [],
  sales = [],
  usdcAmount = '100',
  hasSolanaAccount = true,
  hasCompletedOnboarding = true,
  isEnabled = true,
}: InitialStateCollectiblesOptions = {}) => {
  serveOwnedCards(MOCK_ACCOUNT.address, ownedCards);
  serveBuybackOffers(offers);
  const builder = createStateFixture()
    .withMinimalAccounts()
    .withRemoteFeatureFlags({
      collectiblesEnabled: { enabled: isEnabled, minimumVersion: '0.0.0' },
    })
    .withOverrides({
      engine: {
        backgroundState: {
          CollectiblesController: {
            hasCompletedOnboarding,
            packPartner: {
              operations: {
                [MOCK_ACCOUNT.address]: Object.fromEntries(
                  operations.map((operation) => [operation.memo, operation]),
                ),
              },
              sales: {
                [MOCK_ACCOUNT.address]: Object.fromEntries(
                  sales.map((sale) => [sale.mint, sale]),
                ),
              },
            },
          },
          AssetsController: {
            selectedCurrency: 'usd',
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
