import BN from 'bnjs4';

import { getTronMaxSendableAmount } from '../../../../../../core/Multichain/tron';
import { isTronAddress } from '../../../../../../core/Multichain/utils';
import { fromBNWithDecimals } from '../../../utils/send';
import type { GetMaxSendableAmount } from './types';

// Worst-case native TRX fee: 1.1 TRX in sun (TRX always has 6 decimals).
const TRON_NATIVE_MAX_FEE_RESERVE = new BN('1100000');

export const getTronMaxSendableAmountWithFallback: GetMaxSendableAmount =
  async ({ fromAccount, assetId, toAddress, balance }) => {
    try {
      const result = (await getTronMaxSendableAmount(fromAccount, {
        accountId: fromAccount.id,
        assetId,
        ...(toAddress && isTronAddress(toAddress) ? { toAddress } : {}),
      })) as { amount?: string } | undefined;

      if (result?.amount) {
        return { amount: result.amount };
      }
    } catch {
      // Snap unavailable or not installed: fall back to the estimate below.
    }

    // A TRC-20 transfer pays its fees in TRX, so its balance stays whole.
    const maxValue = balance.rawBalanceBN.sub(
      balance.isNative ? TRON_NATIVE_MAX_FEE_RESERVE : new BN(0),
    );

    return {
      amount: maxValue.isNeg()
        ? '0'
        : fromBNWithDecimals(maxValue, balance.decimals),
    };
  };
