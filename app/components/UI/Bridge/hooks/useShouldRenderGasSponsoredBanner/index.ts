import { useIsNetworkGasSponsored } from '../useIsNetworkGasSponsored';
import { useLatestBalance } from '../useLatestBalance';
import { useSelector } from 'react-redux';
import {
  selectSourceAmount,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import useIsInsufficientBalance from '../useInsufficientBalance';

interface Props {
  latestSourceBalance: ReturnType<typeof useLatestBalance>;
  quoteGasSponsored?: boolean;
}

export const useShouldRenderGasSponsoredBanner = ({
  quoteGasSponsored,
  latestSourceBalance,
}: Props) => {
  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);

  const insufficientBal = useIsInsufficientBalance({
    amount: sourceAmount,
    token: sourceToken,
    latestAtomicBalance: latestSourceBalance?.atomicBalance,
  });

  const isNetworkGasSponsored = useIsNetworkGasSponsored();

  const shouldShowGasSponsored =
    quoteGasSponsored || (insufficientBal && isNetworkGasSponsored);

  return shouldShowGasSponsored;
};
