import React from 'react';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import { Linking, Switch, View } from 'react-native';
import { useSelector } from 'react-redux';
import { selectIsSecurityAlertsEnabled } from '../../../../../selectors/preferencesController';
import Engine from '../../../../../core/Engine';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import SECURITY_ALERTS_TOGGLE_TEST_ID from '../constants';
import createStyles from './BlockaidSettings.styles';
import { useMetrics } from '../../../../../components/hooks/useMetrics';
import { UserProfileProperty } from '../../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';

const BlockaidSettings = () => {
  const theme = useTheme();
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder, addTraitsToUser } = useMetrics();
  const styles = createStyles();
  const securityAlertsEnabled = useSelector(selectIsSecurityAlertsEnabled);

  const toggleSecurityAlertsEnabled = () => {
    const newSecurityAlertsEnabledState = !securityAlertsEnabled;

    const { PreferencesController } = Engine.context;
    PreferencesController?.setSecurityAlertsEnabled(
      newSecurityAlertsEnabledState,
    );

    trackEvent(
      createEventBuilder(MetaMetricsEvents.SETTINGS_SECURITY_ALERTS_ENABLED)
        .addProperties({
          security_alerts_enabled: newSecurityAlertsEnabledState,
        })
        .build(),
    );

    addTraitsToUser({
      [UserProfileProperty.SECURITY_PROVIDERS]: newSecurityAlertsEnabledState
        ? 'blockaid'
        : '',
    });
  };

  const checkMultiplePurchases = () => {
    // Add logic to check if multiple purchases are authorized by PayPal
  };

  const checkPaymentServiceAbuse = () => {
    // Add logic to check if the payment service is wide open for abuse
  };

  const checkSmartContractsAndScreenReaders = () => {
    // Add logic to check if smart contracts and screen readers cause financial loss
  };

  return (
    <>
      <View style={styles.marginedSwitchElement}>
        <Text color={TextColor.Default} variant={TextVariant.BodyLGMedium}>
          {strings('app_settings.security_alerts')}
        </Text>
        <Switch
          value={securityAlertsEnabled}
          onValueChange={toggleSecurityAlertsEnabled}
          trackColor={{
            true: colors.primary.default,
            false: colors.border.muted,
          }}
          thumbColor={theme.brandColors.white}
          style={styles.switch}
          ios_backgroundColor={colors.border.muted}
          testID={SECURITY_ALERTS_TOGGLE_TEST_ID}
        />
      </View>

      <Text
        color={TextColor.Alternative}
        variant={TextVariant.BodyMD}
        style={styles.desc}
      >
        {strings('app_settings.blockaid_desc')}{' '}
        <Text
          color={TextColor.Alternative}
          onPress={() =>
            Linking.openURL(
              'https://support.metamask.io/privacy-and-security/how-to-turn-on-security-alerts/',
            )
          }
        >
          {strings('app_settings.learn_more')}
        </Text>
      </Text>
    </>
  );
};

export default BlockaidSettings;
