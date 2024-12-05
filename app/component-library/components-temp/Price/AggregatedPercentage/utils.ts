import { DECIMALS_TO_SHOW } from '../../../../components/UI/Tokens/constants';
import { renderFiat } from '../../../../util/number';
import { TextColor } from '../../../components/Texts/Text';

export const getFormattedAmountChange = (
  input: number,
  currentCurrency: string,
) =>
  `${input >= 0 ? '+' : ''}${renderFiat(
    input,
    currentCurrency,
    DECIMALS_TO_SHOW,
  )} `;

export const getPercentageTextColor = (
  privacyMode: boolean,
  percentageChangeCrossChains: number,
) => {
  let percentageTextColor;
  if (!privacyMode) {
    if (percentageChangeCrossChains === 0) {
      percentageTextColor = TextColor.Default;
    } else if (percentageChangeCrossChains > 0) {
      percentageTextColor = TextColor.Success;
    } else {
      percentageTextColor = TextColor.Error;
    }
  } else {
    percentageTextColor = TextColor.Alternative;
  }
  return percentageTextColor;
};
