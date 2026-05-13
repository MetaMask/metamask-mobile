import { useIsNetworkGasSponsored } from '../useIsNetworkGasSponsored';
import { useSelector } from 'react-redux';
import {
  selectSourceToken,
  selectDestToken,
} from '../../../../../core/redux/slices/bridge';

interface Props {
  quoteGasSponsored?: boolean;
  hasInsufficientBalance: boolean;
}

export const useShouldRenderGasSponsoredBanner = ({
  quoteGasSponsored,
  hasInsufficientBalance,
}: Props) => {
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const isNetworkGasSponsored = useIsNetworkGasSponsored(sourceToken?.chainId);

  // Sponsorship only applies to same-chain (swap) flows; cross-chain bridges
  // are never sponsored even on networks listed as sponsored.
  const isSameChain = Boolean(
    sourceToken?.chainId &&
      destToken?.chainId &&
      sourceToken.chainId === destToken.chainId,
  );

  const shouldShowGasSponsored =
    quoteGasSponsored ||
    (hasInsufficientBalance && isNetworkGasSponsored && isSameChain);

  return shouldShowGasSponsored;
};
