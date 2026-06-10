import { isNativeAddress, isNonEvmChainId } from '@metamask/bridge-controller';
import { BigNumber } from 'bignumber.js';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import {
  getEstimatedTotalGas,
  type GasFeeEstimatesType,
  // eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
} from '../../../../../confirmations/utils/estimated-total-gas';

interface GetSpendableSourceBalanceParams {
  /** Source token balance in display (decimal token) units, e.g. "1.5". */
  displayBalance: string | undefined;
  /** The selected "Pay with" token. */
  token: Pick<BridgeToken, 'address' | 'chainId' | 'decimals'> | undefined;
  /** Current gas fee estimates for the source chain (EVM only). */
  gasFeeEstimates: GasFeeEstimatesType | undefined;
  /** True when the source network sponsors gas, so no reserve is needed. */
  isGasSponsored?: boolean;
}

/**
 * Returns the amount of the source token (in display units) the user can
 * actually spend in a QuickBuy trade.
 *
 * For EVM-native pay tokens (ETH, POL, BNB, …) gas is paid from the same
 * balance being spent, so offering the entire balance as "max" produces
 * quotes/transactions that cannot pay for gas (TSA-605). We reserve an
 * estimated gas amount by reusing the Send flow's `getEstimatedTotalGas`
 * (the same reserve its percentage/Max buttons apply) and clamp at zero.
 *
 * ERC-20 tokens keep the full balance — their gas is checked separately
 * against the native balance (see `useHasSufficientGas`). Non-EVM natives
 * (SOL, BTC) are excluded too: their reserves are enforced elsewhere
 * (`minSolBalance` rent exemption in `useIsInsufficientBalance`, BTC reserve
 * in `useInsufficientNativeReserveError`) and EVM gas estimates do not apply.
 */
export const getSpendableSourceBalance = ({
  displayBalance,
  token,
  gasFeeEstimates,
  isGasSponsored = false,
}: GetSpendableSourceBalanceParams): number => {
  if (!displayBalance) {
    return 0;
  }
  const balance = parseFloat(displayBalance);
  if (!Number.isFinite(balance) || balance <= 0) {
    return 0;
  }

  const isEvmNativeSource = Boolean(
    token &&
      isNativeAddress(token.address) &&
      token.chainId &&
      !isNonEvmChainId(token.chainId),
  );

  if (!token || !isEvmNativeSource || isGasSponsored || !gasFeeEstimates) {
    return balance;
  }

  const estimatedTotalGasWei = getEstimatedTotalGas(gasFeeEstimates, '0x0');
  const gasBuffer = new BigNumber(estimatedTotalGasWei.toString())
    .shiftedBy(-token.decimals)
    .toNumber();
  if (!Number.isFinite(gasBuffer) || gasBuffer <= 0) {
    return balance;
  }

  return Math.max(balance - gasBuffer, 0);
};
