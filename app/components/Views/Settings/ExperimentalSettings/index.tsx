import React, { FC, useCallback, useEffect } from 'react';
import { ScrollView, Switch, View } from 'react-native';

import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import { colors as importedColors } from '../../../../styles/common';
import { useTheme } from '../../../../util/theme';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { UpdatePPOMInitializationStatus } from '../../../../actions/experimental';
import AnalyticsV2 from '../../../../util/analyticsV2';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import SECURITY_ALERTS_TOGGLE_TEST_ID from './constants';
import { isBlockaidFeatureEnabled } from '../../../../util/blockaid';
import Routes from '../../../../constants/navigation/Routes';
import { useSelector, useDispatch } from 'react-redux';
import { Props } from './ExperimentalSettings.types';
import createStyles from './ExperimentalSettings.styles';
import { selectIsSecurityAlertsEnabled } from '../../../../selectors/preferencesController';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';

/**
 * Main view for app Experimental Settings
 */
const ExperimentalSettings = ({ navigation, route }: Props) => {
  const { PreferencesController } = Engine.context;
  const dispatch = useDispatch();

  const securityAlertsEnabled = useSelector(selectIsSecurityAlertsEnabled);

  const isFullScreenModal = route?.params?.isFullScreenModal;

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const toggleSecurityAlertsEnabled = () => {
    if (securityAlertsEnabled) {
      PreferencesController?.setSecurityAlertsEnabled(!securityAlertsEnabled);
      AnalyticsV2.trackEvent(
        MetaMetricsEvents.SETTINGS_EXPERIMENTAL_SECURITY_ALERTS_ENABLED,
        {
          security_alerts_enabled: false,
        },
      );
    } else {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.BLOCKAID_INDICATOR,
      });
    }
  };

  useEffect(() => {
    dispatch(UpdatePPOMInitializationStatus());
  }, [dispatch]);

  useEffect(
    () => {
      navigation.setOptions(
        getNavigationOptionsTitle(
          strings('app_settings.experimental_title'),
          navigation,
          isFullScreenModal,
          colors,
          null,
        ),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors],
  );

  const goToWalletConnectSessions = useCallback(() => {
    navigation.navigate('WalletConnectSessionsView');
  }, [navigation]);

  const WalletConnectSettings: FC = () => (
    <>
      <Text color={TextColor.Default} variant={TextVariant.BodyLGMedium}>
        {strings('experimental_settings.wallet_connect_dapps')}
      </Text>
      <Text
        color={TextColor.Alternative}
        variant={TextVariant.BodyMD}
        style={styles.desc}
      >
        {strings('experimental_settings.wallet_connect_dapps_desc')}
      </Text>
      <Button
        variant={ButtonVariants.Secondary}
        size={ButtonSize.Lg}
        label={strings('experimental_settings.wallet_connect_dapps_cta')}
        onPress={goToWalletConnectSessions}
        width={ButtonWidthTypes.Full}
        style={styles.accessory}
      />
    </>
  );

  const BlockaidSettings: FC = () => (
    <>
      <Text
        color={TextColor.Default}
        variant={TextVariant.HeadingLG}
        style={styles.heading}
      >
        {strings('app_settings.security_heading')}
      </Text>
      <View style={styles.setting}>
        <Text color={TextColor.Default} variant={TextVariant.BodyLGMedium}>
          {strings('experimental_settings.security_alerts')}
        </Text>
        <Text
          color={TextColor.Alternative}
          variant={TextVariant.BodyMD}
          style={styles.desc}
        >
          {strings('experimental_settings.security_alerts_desc')}
        </Text>
      </View>
      <View style={styles.switchElement}>
        <Text color={TextColor.Default} variant={TextVariant.BodyLGMedium}>
          {strings('experimental_settings.blockaid')}
        </Text>
        <Switch
          value={securityAlertsEnabled}
          onValueChange={toggleSecurityAlertsEnabled}
          trackColor={{
            true: colors.primary.default,
            false: colors.border.muted,
          }}
          thumbColor={importedColors.white}
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
        {strings('experimental_settings.blockaid_desc')}
      </Text>
    </>
  );

  return (
    <ScrollView style={styles.wrapper}>
      <WalletConnectSettings />
      {isBlockaidFeatureEnabled() && <BlockaidSettings />}
    </ScrollView>
  );
};

export default ExperimentalSettings;
