export const EM_DASH = '\u2014';

export const formatPercent = (value) => `${Math.round(Number(value))}%`;

export const formatFeedPostAge = () => '40 min ago';

export const formatSignedFullUsdNoDecimals = (value) => {
  if (value == null) {
    return EM_DASH;
  }
  const amount = Math.abs(Math.round(Number(value))).toLocaleString('en-US');
  return `${value >= 0 ? '+' : '-'}$${amount}`;
};
