import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

export type PredictBuyErrorBannerVariant = 'price_changed' | 'order_failed';

interface PredictBuyErrorBannerProps {
  variant: PredictBuyErrorBannerVariant;
  title: string;
  description: string;
  testID?: string;
}

const VARIANT_STYLES: Record<
  PredictBuyErrorBannerVariant,
  {
    containerClass: string;
    iconName: IconName;
    iconColor: IconColor;
    titleColor: TextColor;
  }
> = {
  price_changed: {
    containerClass: 'bg-warning-muted',
    iconName: IconName.Warning,
    iconColor: IconColor.WarningDefault,
    titleColor: TextColor.WarningDefault,
  },
  order_failed: {
    containerClass: 'bg-error-muted',
    iconName: IconName.Danger,
    iconColor: IconColor.ErrorDefault,
    titleColor: TextColor.ErrorDefault,
  },
};

const PredictBuyErrorBanner = ({
  variant,
  title,
  description,
  testID,
}: PredictBuyErrorBannerProps) => {
  const styles = VARIANT_STYLES[variant];

  return (
    // `-mt-1` (-4px) trims the 24px gap left by the preceding PredictFeeSummary
    // (`pb-6`) down to 20px so it matches this banner's own `mb-5` (20px) gap to
    // the action button, keeping the banner evenly spaced. If PredictFeeSummary's
    // bottom padding changes, revisit this offset.
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Start}
      twClassName={`-mt-1 mb-5 p-3 rounded-lg gap-3 ${styles.containerClass}`}
      testID={testID}
    >
      <Icon
        name={styles.iconName}
        color={styles.iconColor}
        size={IconSize.Md}
        testID={`${testID ?? 'predict-buy-error-banner'}-icon`}
      />
      <Box twClassName="flex-1 min-w-0">
        <Text
          variant={TextVariant.BodyMd}
          color={styles.titleColor}
          twClassName="font-medium"
          testID={`${testID ?? 'predict-buy-error-banner'}-title`}
        >
          {title}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextDefault}
          testID={`${testID ?? 'predict-buy-error-banner'}-description`}
        >
          {description}
        </Text>
      </Box>
    </Box>
  );
};

export default PredictBuyErrorBanner;
