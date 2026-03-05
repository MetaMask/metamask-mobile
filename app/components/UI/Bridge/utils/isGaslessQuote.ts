import { Quote } from '@metamask/bridge-controller';

export const isGaslessQuote = (quote?: Quote) => {
  const gasIncluded = !!quote?.gasIncluded;
  const gasIncluded7702 = !!quote?.gasIncluded7702;
  const isGasless = gasIncluded7702 || gasIncluded;

  return isGasless;
};
