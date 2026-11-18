export const isQuickBuyCopyTrade = ({
  copyTradeOrigin,
  isCopyTrade,
}: {
  copyTradeOrigin?: unknown;
  isCopyTrade?: boolean;
}): boolean => Boolean(copyTradeOrigin) || isCopyTrade === true;
