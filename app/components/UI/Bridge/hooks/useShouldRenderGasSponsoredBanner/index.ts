import { useIsNetworkGasSponsored } from '../useIsNetworkGasSponsored';
import { useSelector } from 'react-redux';
import { selectSourceToken } from '../../../../../core/redux/slices/bridge';

interface Props {
  quoteGasSponsored?: boolean;
  hasInsufficientBalance: boolean;
}

export const useShouldRenderGasSponsoredBanner = ({
  quoteGasSponsored,
  hasInsufficientBalance,
}: Props) => {
  const sourceToken = useSelector(selectSourceToken);
  const isNetworkGasSponsored = useIsNetworkGasSponsored(sourceToken?.chainId);

  const shouldShowGasSponsored =
    quoteGasSponsored || (hasInsufficientBalance && isNetworkGasSponsored);

  return shouldShowGasSponsored;
};
