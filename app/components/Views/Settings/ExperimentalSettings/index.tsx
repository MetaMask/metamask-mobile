import React, { FC, useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import {
  colors as importedColors,
  fontStyles,
} from '../../../../styles/common';
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

const createStyles = (colors: any) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      padding: 24,
      paddingBottom: 48,
    },
    title: {
      ...(fontStyles.normal as any),
      lineHeight: 20,
      paddingTop: 4,
      marginTop: -4,
    },
    boldTitle: {
      ...(fontStyles.bold as any),
      marginTop: 18,
      marginBottom: 18,
    },
    heading: {
      ...fontStyles.normal,
      marginTop: 18,
    },
    desc: {
      lineHeight: 20,
      marginTop: 12,
    },
    setting: {
      marginVertical: 16,
    },
    clearHistoryConfirm: {
      marginTop: 18,
    },
    switchElement: {
      display: 'flex',
      justifyContent: 'space-between',
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 5,
    },
    switch: {
      alignSelf: 'flex-end',
    },
    modalView: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
      padding: 20,
    },
    modalText: {
      ...fontStyles.normal,
      fontSize: 18,
      textAlign: 'center',
      color: colors.text.default,
    },
    modalTitle: {
      ...fontStyles.bold,
      fontSize: 22,
      textAlign: 'center',
      marginBottom: 20,
      color: colors.text.default,
    },
  });

interface Props {
  /**
	/* navigation object required to push new views
	*/
  navigation: any;
  /**
   * contains params that are passed in from navigation
   */
  route: any;
}

/**
 * Main view for app Experimental Settings
 */
const ExperimentalSettings = ({ navigation, route }: Props) => {
  const { PreferencesController } = Engine.context;
  const [securityAlertsEnabled, setSecurityAlertsEnabled] = useState(() => PreferencesController.state.securityAlertsEnabled);
  const isFullScreenModal = route?.params?.isFullScreenModal;
  const { colors } = useTheme();
  const styles = createStyles(colors);

  useEffect(() => {
    if(route?.params?.securityAlertsEnabled) {
      setSecurityAlertsEnabled(route.params.securityAlertsEnabled);
    }
  }, [securityAlertsEnabled]);

  const toggleSecurityAlertsEnabled = () => {
    setSecurityAlertsEnabled(!securityAlertsEnabled);
     
    if(!securityAlertsEnabled) {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.PPOMLoading,
      params: {
        securityAlertsEnabled: !securityAlertsEnabled,
      },
    })
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
