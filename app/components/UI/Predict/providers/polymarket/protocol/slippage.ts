import { Side, type OrderPreview } from '../../../types';

export function getMinAmountReceivedWithSlippage(
  preview: OrderPreview,
): number {
  if (preview.minAmountReceivedAfterSlippage !== undefined) {
    return preview.minAmountReceivedAfterSlippage;
  }

  const minAmountWithSlippage =
    preview.minAmountReceived * (1 - preview.slippage);

  if (preview.side === Side.BUY) {
    return Math.max(
      minAmountWithSlippage,
      preview.maxAmountSpent + preview.tickSize,
    );
  }

  return minAmountWithSlippage;
}
