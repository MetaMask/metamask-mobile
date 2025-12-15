import React, { useCallback, useEffect } from 'react';
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
  const {
    selectedPaymentMethodId,
    selectedRegion,
    selectedAsset,
    selectedFiatCurrencyId,
    isBuy,
  } = useRampSDK();

  const ctaOnPressCallback = useCallback(() => {
    ctaOnPress?.();
  }, [ctaOnPress]);

  useEffect(() => {
    trackEvent(isBuy ? 'ONRAMP_ERROR' : 'OFFRAMP_ERROR', {
      location,
      message: description,
      payment_method_id: selectedPaymentMethodId as string,
      region: selectedRegion?.id,
      currency_source: isBuy
        ? (selectedFiatCurrencyId as string)
        : selectedAsset?.symbol,
      currency_destination: isBuy
        ? selectedAsset?.symbol
        : (selectedFiatCurrencyId as string),
    });
    // Dependency array does not include extra data since it can mutate after the error
    // is displayed. This is a safe guard to prevent the error from being tracked multiple
    // times.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, location, trackEvent]);

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
