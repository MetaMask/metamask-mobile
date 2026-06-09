import {
  IconColor,
  IconName,
  TextColor,
} from '@metamask/design-system-react-native';
import AppConstants from '../../../../core/AppConstants';

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

/**
 * Parses the priceImpact string from an active quote into a number.
 * Returns 0 when absent — treating a missing value as safe (no impact).
 */
export function parsePriceImpact(priceImpactStr: string | undefined): number {
  if (!priceImpactStr) return 0;
  return Number.parseFloat(priceImpactStr);
}

/**
 * Returns true when the price impact meets or exceeds the error threshold,
 * falling back to AppConstants when the feature flag is not set.
 */
export function exceedsPriceImpactErrorThreshold(
  priceImpact: number,
  errorThreshold?: number,
): boolean {
  return (
    Number.isFinite(priceImpact) &&
    priceImpact >=
      (errorThreshold ?? AppConstants.BRIDGE.PRICE_IMPACT_ERROR_THRESHOLD)
  );
}
