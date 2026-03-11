import {
  IconColor,
  IconName,
  TextColor,
} from '@metamask/design-system-react-native';

interface Params {
  priceImpactValue?: string;
  threshold: { warning: number; error: number };
}

export const getPriceImpactViewData = ({
  priceImpactValue,
  threshold,
}: Params) => {
  if (!priceImpactValue) {
    return {
      textColor: TextColor.TextAlternative,
      icon: undefined,
      title: 'bridge.price_impact_info_title',
      description: 'bridge.price_impact_info_description',
    };
  }

  const priceImpact = Number.parseFloat(priceImpactValue.replace('%', ''));

  if (!Number.isFinite(priceImpact)) {
    return {
      textColor: TextColor.TextAlternative,
      icon: undefined,
      title: 'bridge.price_impact_info_title',
      description: 'bridge.price_impact_info_description',
    };
  }

  if (priceImpact >= threshold.error) {
    return {
      textColor: TextColor.ErrorDefault,
      icon: {
        name: IconName.Danger,
        color: IconColor.ErrorDefault,
      },
      title: 'bridge.price_impact_error_title',
      description: 'bridge.price_impact_error_description',
    };
  }

  if (priceImpact >= threshold.warning) {
    return {
      textColor: TextColor.WarningDefault,
      icon: {
        name: IconName.Warning,
        color: IconColor.WarningDefault,
      },
      title: 'bridge.price_impact_warning_title',
      description: 'bridge.price_impact_warning_description',
    };
  }

  return {
    textColor: TextColor.TextAlternative,
    icon: undefined,
    title: 'bridge.price_impact_info_title',
    description: 'bridge.price_impact_info_description',
  };
};
