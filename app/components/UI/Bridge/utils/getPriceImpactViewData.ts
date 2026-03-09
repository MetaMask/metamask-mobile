import { IconName } from '../../../../component-library/components/Icons/Icon';
import { TextColor } from '../../../../component-library/components/Texts/Text';

interface Params {
  priceImpactValue?: string;
  threshold: { warning: number; danger: number };
}

export const getPriceImpactViewData = ({
  priceImpactValue,
  threshold,
}: Params) => {
  if (!priceImpactValue) {
    return {
      textColor: TextColor.Alternative,
      icon: undefined,
    };
  }

  const priceImpact = Number.parseFloat(priceImpactValue.replace('%', ''));

  if (!Number.isFinite(priceImpact)) {
    return {
      textColor: TextColor.Alternative,
      icon: undefined,
    };
  }

  if (priceImpact >= threshold.danger) {
    return {
      textColor: TextColor.Error,
      icon: {
        name: IconName.Danger,
        color: TextColor.Error,
      },
    };
  }

  if (priceImpact >= threshold.warning) {
    return {
      textColor: TextColor.Warning,
      icon: {
        name: IconName.Warning,
        color: TextColor.Warning,
      },
    };
  }

  return {
    textColor: TextColor.Alternative,
    icon: undefined,
  };
};
