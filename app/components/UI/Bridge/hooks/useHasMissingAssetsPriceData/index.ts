import { useSelector } from 'react-redux';
import {
  selectDestToken,
  selectSourceAmount,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { hasMissingAssetsPriceData } from '../../utils/hasMissingAssetsPriceData';
import { useTokenFiatRate } from '../useTokenFiatRate';

export const useHasMissingAssetsPriceData = () => {
  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const sourceFiatRate = useTokenFiatRate(sourceToken);
  const destFiatRate = useTokenFiatRate(destToken);

  return hasMissingAssetsPriceData({
    sourceAmount,
    sourceToken,
    destToken,
    sourceFiatRate,
    destFiatRate,
  });
};
