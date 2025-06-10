import { useSelector } from 'react-redux';
import { selectBridgeControllerState } from '../../../../../selectors/bridgeController';
import { useLatestBalance } from '../useLatestBalance';
import { BigNumber } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { BridgeToken } from '../../types';

interface UseIsInsufficientBalanceParams {
  amount: string | undefined;
  token: BridgeToken | undefined;
}

const useIsInsufficientBalance = ({ amount, token }: UseIsInsufficientBalanceParams): boolean => {
  const { quoteRequest } = useSelector(selectBridgeControllerState);
  const latestBalance = useLatestBalance({
    address: token?.address,
    decimals: token?.decimals,
    chainId: token?.chainId,
    balance: token?.balance,
  });

  const isValidAmount =
    amount !== undefined && amount !== '.' && token?.decimals;

  // quoteRequest.insufficientBal is undefined for Solana quotes, so we need to manually check if the source amount is greater than the balance
  const isInsufficientBalance = quoteRequest?.insufficientBal ||
    (isValidAmount &&
      parseUnits(amount, token.decimals).gt(
        latestBalance?.atomicBalance ?? BigNumber.from(0),
      ));

  return Boolean(isInsufficientBalance);
};

export default useIsInsufficientBalance;
