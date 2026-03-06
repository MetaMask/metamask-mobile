import { IconName } from '../../../../component-library/components/Icons/Icon';
import { TextColor } from '../../../../component-library/components/Texts/Text';
import AppConstants from '../../../../core/AppConstants';

export const getPriceImpactViewData = (priceImpactValue?: string) => {
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

  if (priceImpact >= AppConstants.BRIDGE.PRICE_IMPACT_ERROR_THRESHOLD) {
    return {
      textColor: TextColor.Error,
      icon: {
        name: IconName.Danger,
        color: TextColor.Error,
      },
    };
  }

  if (priceImpact >= AppConstants.BRIDGE.PRICE_IMPACT_WARNING_THRESHOLD) {
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
