import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../../util/theme';
import Title from '../../../Base/Title';
import Text from '../../../Base/Text';
import StyledButton from '../../StyledButton';
import { strings } from '../../../../../locales/i18n';
import { Colors } from '../../../../util/theme/models';
import { ScreenLocation } from '../types';
import useAnalytics from '../hooks/useAnalytics';
import { useFiatOnRampSDK } from '../sdk';

type IconType = 'error' | 'info' | 'expired';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.default,
    },
    content: {
      width: '100%',
      paddingHorizontal: 60,
      marginTop: -100,
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
  ctaOnPress?: () => any; // The optional callback to be invoked when pressing the CTA button (Optional)
  icon?: IconType;
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
  icon = 'error',
}: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const trackEvent = useAnalytics();
  const {
    selectedPaymentMethodId,
    selectedRegion,
    selectedAsset,
    selectedFiatCurrencyId,
  } = useFiatOnRampSDK();

  const ctaOnPressCallback = useCallback(() => {
    ctaOnPress?.();
  }, [ctaOnPress]);

  useEffect(() => {
    trackEvent('ONRAMP_ERROR', {
      location,
      message: description,
      payment_method_id: selectedPaymentMethodId as string,
      region: selectedRegion?.id,
      currency_source: selectedFiatCurrencyId as string,
      currency_destination: selectedAsset?.symbol,
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
            <StyledButton type="confirm" onPress={ctaOnPressCallback}>
              {ctaLabel || strings('fiat_on_ramp_aggregator.try_again')}
            </StyledButton>
          </View>
        )}
      </View>
    </View>
  );
}

export default ErrorView;
