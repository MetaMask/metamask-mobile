import { useIsNetworkGasSponsored } from '../useIsNetworkGasSponsored';
import { useLatestBalance } from '../useLatestBalance';
import { useSelector } from 'react-redux';
import {
  selectSourceAmount,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import useIsInsufficientBalance from '../useInsufficientBalance';

interface Props {
  quoteGasSponsored?: boolean;
}

export const useShouldRenderGasSponsoredBanner = ({
  quoteGasSponsored,
}: Props) => {
  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const latestSourceBalance = useLatestBalance({
    address: sourceToken?.address,
    decimals: sourceToken?.decimals,
    chainId: sourceToken?.chainId,
    balance: sourceToken?.balance,
  });

  const insufficientBal = useIsInsufficientBalance({
    amount: sourceAmount,
    token: sourceToken,
    latestAtomicBalance: latestSourceBalance?.atomicBalance,
  });

  const isNetworkGasSponsored = useIsNetworkGasSponsored(sourceToken?.chainId);

  const shouldShowGasSponsored =
    quoteGasSponsored || (insufficientBal && isNetworkGasSponsored);

  return shouldShowGasSponsored;
};
