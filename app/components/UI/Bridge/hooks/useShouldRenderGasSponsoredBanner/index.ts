import { useIsNetworkGasSponsored } from '../useIsNetworkGasSponsored';
import { useSelector } from 'react-redux';
import { selectSourceToken } from '../../../../../core/redux/slices/bridge';
import { useIsHardwareWalletForBridge } from '../useIsHardwareWalletForBridge';

interface Props {
  quoteGasSponsored?: boolean;
  hasInsufficientBalance: boolean;
}

/**
 * Whether to show "Gas sponsored" / "No network fee" messaging.
 * Hardware wallet accounts must never see sponsorship UI; use effectiveGasIncluded.
 */
export const useShouldRenderGasSponsoredBanner = ({
  quoteGasSponsored,
  hasInsufficientBalance,
}: Props) => {
  const sourceToken = useSelector(selectSourceToken);
  const isNetworkGasSponsored = useIsNetworkGasSponsored(sourceToken?.chainId);
  const isHardwareWallet = useIsHardwareWalletForBridge();

  if (isHardwareWallet) {
    return false;
  }

  const shouldShowGasSponsored =
    quoteGasSponsored || (hasInsufficientBalance && isNetworkGasSponsored);

  return shouldShowGasSponsored;
};
