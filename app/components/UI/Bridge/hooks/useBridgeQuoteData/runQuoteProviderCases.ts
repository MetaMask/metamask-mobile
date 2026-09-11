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
import { useSwapsFeatureId } from '../useSwapsFeatureId';
import { FeatureId } from '@metamask/bridge-controller';
import { useBridgeSession } from '../useBridgeSession';
import type { buildGenericQuoteRequest } from '../useSwapQuotes/utils';
import { BigNumber } from 'ethers';
import { BridgeTabKey } from '../../Views/BridgeView/BridgeView.constants';

const mockUseIsInsufficientBalance = jest.mocked(useInsufficientBalance);
const mockUseSwapsFeatureId = jest.mocked(useSwapsFeatureId);
const mockUseValidateBridgeTx = jest.mocked(useValidateBridgeTx);
const mockValidateBridgeTx = jest.fn();
const mockUseBridgeSession = jest.mocked(useBridgeSession);

export const runQuoteProviderCases = ({
  name,
  missingProviderError,
  renderProvider,
  renderWithoutProvider,
  featureId,
  quoteParams,
}: {
  name: string;
  missingProviderError: string;
  renderProvider: (state: DeepPartial<RootState>) => void;
  renderWithoutProvider: () => void;
  featureId: FeatureId;
  quoteParams: Parameters<typeof buildGenericQuoteRequest>[0]['quoteParams'];
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
      mockValidateBridgeTx.mockResolvedValue({ status: 'SUCCESS' });
      mockUseValidateBridgeTx.mockReturnValue({
        validateBridgeTx: mockValidateBridgeTx,
      });
      mockUseSwapsFeatureId.mockReturnValue(featureId);
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
      mockUseBridgeSession.mockReturnValue({
        selectedTab: BridgeTabKey.Market,
        renderedTab: BridgeTabKey.Market,
        setSelectedTab: jest.fn(),
        setRenderedTab: jest.fn(),
        quoteParams,
        latestSourceBalance: {
          atomicBalance: BigNumber.from('1000000000'),
          displayBalance: '123',
        },
      });
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

    it('throws when used outside its quote provider', () => {
      jest.spyOn(console, 'error').mockImplementation();

      const renderOutsideProvider = () => renderWithoutProvider();

      expect(renderOutsideProvider).toThrow(missingProviderError);
    });
  });
