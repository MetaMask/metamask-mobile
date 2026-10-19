import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../../../util/theme';
import Title from '../../../../Base/Title';
import Text from '../../../../Base/Text';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../locales/i18n';
import { Colors } from '../../../../../util/theme/models';
import { ScreenLocation } from '../types';
import useAnalytics from '../../hooks/useAnalytics';
import { useRampSDK } from '../sdk';

type IconType = 'error' | 'info' | 'expired';

const createStyles = (
  colors: Colors,
  options?: {
    asScreen: boolean;
  },
) =>
  StyleSheet.create({
    screen: {
      flex: options?.asScreen ? 1 : undefined,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.default,
    },
    content: {
      width: '100%',
      paddingHorizontal: 60,
      marginVertical: 60,
    },
    ctaContainer: {
      marginTop: 30,
    },
    row: {
      marginVertical: 1,
    },
    icon: {
      fontSize: 38,
      marginVertical: 4,
      textAlign: 'center',
    },
    errorIcon: {
      color: colors.error.default,
    },
    infoIcon: {
      color: colors.primary.default,
    },
  });

interface Props {
  description: string; // The error description (Required)
  title?: string; //  The error title, default will be "Error" if not provided (Optional)
  ctaLabel?: string; // The CTA button label, default will be "Try again" (Optional)
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctaOnPress?: () => any; // The optional callback to be invoked when pressing the CTA button (Optional)
  icon?: IconType;
  asScreen?: boolean; // Whether this component should be rendered as a screen or not (Optional)
  location: ScreenLocation;
}

function ErrorIcon({ icon }: { icon: IconType }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  let name, style;
  switch (icon) {
    case 'info': {
      name = 'information-outline';
      style = styles.infoIcon;
      break;
    }
    case 'expired': {
      name = 'clock-outline';
      style = styles.infoIcon;
      break;
    }
    case 'error':
    default: {
      name = 'close-circle-outline';
      style = styles.errorIcon;
      break;
    }
  }

  return <MaterialCommunityIcons name={name} style={[styles.icon, style]} />;
}

function ErrorView({
  description,
  title,
  ctaLabel,
  ctaOnPress,
  location,
  asScreen = true,
  icon = 'error',
}: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors, {
    asScreen,
  });
  const trackEvent = useAnalytics();
  const sdk = useRampSDK();
  const {
    selectedPaymentMethodId,
    selectedRegion,
    selectedAsset,
    selectedFiatCurrencyId,
    isBuy,
  } = sdk || {};

  const ctaOnPressCallback = useCallback(() => {
    ctaOnPress?.();
  }, [ctaOnPress]);

  // Track each ErrorView instance once. Extra SDK fields can mutate after the
  // error is shown; the ref guard keeps analytics from firing repeatedly when
  // those values change.
  const hasTrackedErrorRef = useRef(false);
  // One-frame grace so selectedRegion / selectedAsset / fiat can hydrate after
  // sdk/isBuy are ready before we permanently lock the analytics snapshot.
  const [hydrationGraceElapsed, setHydrationGraceElapsed] = useState(false);

  useEffect(() => {
    setHydrationGraceElapsed(true);
  }, []);

  useEffect(() => {
    if (!sdk || isBuy === undefined || hasTrackedErrorRef.current) {
      return;
    }

    const regionId = selectedRegion?.id;
    const assetSymbol = selectedAsset?.symbol;
    const fiatCurrencyId = selectedFiatCurrencyId;
    const hasHydratedAnalyticsFields =
      Boolean(regionId) && (Boolean(assetSymbol) || Boolean(fiatCurrencyId));

    // Prefer a complete payload when selections hydrate shortly after mount.
    // If they never arrive (pre-selection errors), track once the grace ends.
    if (!hasHydratedAnalyticsFields && !hydrationGraceElapsed) {
      return;
    }

    hasTrackedErrorRef.current = true;
    trackEvent(isBuy ? 'ONRAMP_ERROR' : 'OFFRAMP_ERROR', {
      location,
      message: description,
      payment_method_id: selectedPaymentMethodId as string,
      region: regionId,
      currency_source: isBuy ? (fiatCurrencyId as string) : assetSymbol,
      currency_destination: isBuy ? assetSymbol : (fiatCurrencyId as string),
    });
  }, [
    sdk,
    isBuy,
    description,
    location,
    trackEvent,
    selectedPaymentMethodId,
    selectedRegion?.id,
    selectedFiatCurrencyId,
    selectedAsset?.symbol,
    hydrationGraceElapsed,
  ]);

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.row}>
          <ErrorIcon icon={icon} />
        </View>

        <View style={styles.row}>
          <Title centered>
            {title || strings('fiat_on_ramp_aggregator.error')}
          </Title>
        </View>

        <View style={styles.row}>
          <Text centered grey>
            {description}
          </Text>
        </View>

        {ctaOnPress && (
          <View style={styles.ctaContainer}>
            <Button
              size={ButtonSize.Lg}
              onPress={ctaOnPressCallback}
              label={ctaLabel || strings('fiat_on_ramp_aggregator.try_again')}
              variant={ButtonVariants.Primary}
              width={ButtonWidthTypes.Full}
            />
          </View>
        )}
      </View>
    </View>
  );
}

export default ErrorView;
