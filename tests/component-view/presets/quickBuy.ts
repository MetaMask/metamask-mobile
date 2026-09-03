import { initialStateBridge } from './bridge';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';

const SELECTED_ADDRESS = '0x0000000000000000000000000000000000000001';
/** 10 ETH in wei — enough for $10–$250 quick-amount pills at $2000/ETH. */
const TEN_ETH_HEX = '0x8ac7230489e80000';

interface InitialStateQuickBuyOptions {
  deterministicFiat?: boolean;
}

/**
 * Bridge preset plus ETH balance / rates so Quick Buy has a priced pay-with
 * token and mainnet enabled as src+dest.
 */
export const initialStateQuickBuy = (options?: InitialStateQuickBuyOptions) =>
  initialStateBridge({ deterministicFiat: options?.deterministicFiat ?? true })
    .withBridgeRecommendedQuoteEvmSimple()
    .withOverrides({
      engine: {
        backgroundState: {
          AccountTrackerController: {
            accountsByChainId: {
              '0x1': {
                [SELECTED_ADDRESS]: {
                  address: SELECTED_ADDRESS,
                  balance: TEN_ETH_HEX,
                },
              },
            },
          },
          PreferencesController: {
            tokenSortConfig: {
              key: 'tokenFiatAmount',
              order: 'dsc',
              sortCallback: 'stringNumeric',
            },
          },
        },
      },
    } as unknown as DeepPartial<RootState>);
