import { waitFor } from '@testing-library/react-native';
import { SolScope } from '@metamask/keyring-api';
import { createBridgeTestState } from '../../testUtils';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
// eslint-disable-next-line import-x/no-namespace -- jest.spyOn must patch the module namespace the hook imports
import * as quoteUtils from '../../utils/quoteUtils';
// eslint-disable-next-line import-x/no-namespace -- jest.spyOn must patch the module namespace the hook imports
import * as bridgeController from '@metamask/bridge-controller';
import type { RootState } from '../../../../../reducers';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import useInsufficientBalance from '../useInsufficientBalance';
import useValidateBridgeTx from '../../../../../util/bridge/hooks/useValidateBridgeTx';

const mockUseIsInsufficientBalance =
  useInsufficientBalance as jest.MockedFunction<typeof useInsufficientBalance>;

const mockValidateBridgeTx = useValidateBridgeTx as jest.MockedFunction<
  typeof useValidateBridgeTx
>;

export const runQuoteProviderCases = ({
  name,
  missingProviderError,
  renderProvider,
  renderWithoutProvider,
}: {
  name: string;
  missingProviderError: string;
  renderProvider: (state: DeepPartial<RootState>) => void;
  renderWithoutProvider: () => void;
}) =>
  describe(name, () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.spyOn(quoteUtils, 'isQuoteExpired').mockImplementation(jest.fn());
      jest
        .spyOn(quoteUtils, 'getQuoteRefreshRate')
        .mockImplementation(jest.fn());
      jest
        .spyOn(quoteUtils, 'shouldRefreshQuote')
        .mockImplementation(jest.fn());
      mockUseIsInsufficientBalance.mockReturnValue(false);
      mockValidateBridgeTx.mockImplementation(() => ({
        validateBridgeTx: jest.fn().mockResolvedValue({ status: 'SUCCESS' }),
      }));
      jest
        .spyOn(bridgeController, 'selectBridgeQuotes')
        .mockImplementation(() => ({
          recommendedQuote: mockQuoteWithMetadata,
          sortedQuotes: [mockQuoteWithMetadata],
          activeQuote: mockQuoteWithMetadata,
          quotesLastFetchedMs: 1_700_000_000_000,
          isLoading: false,
          quoteFetchError: null,
          quotesRefreshCount: 0,
          isQuoteGoingToRefresh: false,
          quotesInitialLoadTimeMs: 0,
        }));
      jest
        .spyOn(bridgeController, 'selectBridgeFeatureFlags')
        .mockImplementation(() => ({
          minimumVersion: '7.58.0',
          priceImpactThreshold: {
            gasless: 0.4,
            normal: 0.19,
            warning: 0.05,
            error: 0.25,
          },
          support: true,
          chains: {},
          refreshRate: 5000,
          maxRefreshCount: 10,
        }));
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('shares one bridge quote data instance across multiple consumers', async () => {
      jest.spyOn(console, 'warn').mockImplementation();

      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          sourceAmount: '0.5',
          sourceToken: {
            symbol: 'SOL',
            chainId: SolScope.Mainnet,
            address:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:11111111111111111111111111111111',
            decimals: 9,
          },
          destToken: {
            symbol: 'USDC',
            chainId: SolScope.Mainnet,
            address:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            decimals: 6,
          },
        },
      });

      renderProvider(testState);

      await waitFor(() => {
        expect(mockValidateBridgeTx).toHaveBeenCalledTimes(1);
      });
    });

    it('throws when used outside BridgeQuoteDataProvider', () => {
      jest.spyOn(console, 'error').mockImplementation();

      const renderOutsideProvider = () => renderWithoutProvider();

      expect(renderOutsideProvider).toThrow(missingProviderError);
    });
  });
