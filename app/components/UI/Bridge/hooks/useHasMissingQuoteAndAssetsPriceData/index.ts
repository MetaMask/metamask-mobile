import { useSelector } from 'react-redux';
import {
  selectDestToken,
  selectSourceAmount,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { hasMissingQuoteAndAssetsPriceData } from '../../utils/hasMissingQuoteAndAssetsPriceData';
import { useBridgeQuoteDataContext } from '../useBridgeQuoteData/BridgeQuoteDataContext';
import { useTokenFiatRate } from '../useTokenFiatRate';

export const useHasMissingQuoteAndAssetsPriceData = () => {
  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const { activeQuote, isActiveQuoteForCurrentTokenPair } =
    useBridgeQuoteDataContext();
  const sourceFiatRate = useTokenFiatRate(sourceToken);
  const destFiatRate = useTokenFiatRate(destToken);

  return hasMissingQuoteAndAssetsPriceData({
    sourceAmount,
    sourceToken,
    destToken,
    sourceFiatRate,
    destFiatRate,
    activeQuote,
    isActiveQuoteForCurrentTokenPair,
  });
};
