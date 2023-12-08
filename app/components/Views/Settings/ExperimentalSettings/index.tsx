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
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import StyledButton from '../../../UI/StyledButton';
import SECURITY_ALERTS_TOGGLE_TEST_ID from './constants';
import { isBlockaidFeatureEnabled } from '../../../../util/blockaid';
import Routes from '../../../../constants/navigation/Routes';
import { useSelector, useDispatch } from 'react-redux';
import { Props } from './ExperimentalSettings.types';
import createStyles from './ExperimentalSettings.styles';
import { selectIsSecurityAlertsEnabled } from '../../../../selectors/preferencesController';

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
      dispatch({
        type: 'SET_PPOM_INITIALIZATION_COMPLETED',
        ppomInitializationCompleted: false,
      });
      PreferencesController?.setSecurityAlertsEnabled(!securityAlertsEnabled);
    } else {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.BLOCKAID_INDICATOR,
      });
    }
  };

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
      <Text
        color={TextColor.Default}
        variant={TextVariant.HeadingMD}
        style={styles.title}
      >
        {strings('experimental_settings.wallet_connect_dapps')}
      </Text>
      <Text
        color={TextColor.Alternative}
        variant={TextVariant.BodyMD}
        style={styles.desc}
      >
        {strings('experimental_settings.wallet_connect_dapps_desc')}
      </Text>
      <StyledButton
        type="normal"
        onPress={goToWalletConnectSessions}
        containerStyle={styles.clearHistoryConfirm}
      >
        {strings('experimental_settings.wallet_connect_dapps_cta')}
      </StyledButton>
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
        <Text
          color={TextColor.Default}
          variant={TextVariant.HeadingMD}
          style={styles.title}
        >
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
      <Text
        color={TextColor.Default}
        variant={TextVariant.HeadingSM}
        style={styles.boldTitle}
      >
        {strings('experimental_settings.select_provider')}
      </Text>
      <View style={styles.switchElement}>
        <Text
          color={TextColor.Default}
          variant={TextVariant.HeadingSMRegular}
          style={styles.title}
        >
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
        style={styles.title}
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
