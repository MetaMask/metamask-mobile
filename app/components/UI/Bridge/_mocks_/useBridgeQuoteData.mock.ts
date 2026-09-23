import { mockQuoteWithMetadata } from './bridgeQuoteWithMetadata';
import { useBridgeQuoteDataContext } from '../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { RequestStatus } from '@metamask/bridge-controller';

export const mockUseBridgeQuoteData: ReturnType<
  typeof useBridgeQuoteDataContext
> = {
  activeQuote: mockQuoteWithMetadata,
  bestQuote: mockQuoteWithMetadata,
  isLoading: false,
  destTokenAmount: '24.44',
  quoteFetchError: null,
  isNoQuotesAvailable: false,
  isExpired: false,
  needsNewQuote: false,
  willRefresh: false,
  isActiveQuoteForCurrentTokenPair: true,
  formattedQuoteData: {
    networkFee: '0',
    estimatedTime: '0 min',
    rate: '0',
    priceImpact: '1%',
    priceImpactFiat: '1',
    slippage: '0.5%',
  },
  quotesLoadingStatus: RequestStatus.FETCHED,
  blockaidError: null,
  shouldShowPriceImpactWarning: false,
  validQuotes: [mockQuoteWithMetadata],
};
