import React, { FC, useCallback, useEffect } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { strings } from '../../../../../locales/i18n';
import { setSecurityAlertsEnabled } from '../../../../actions/experimental';
import {
  colors as importedColors,
  fontStyles,
} from '../../../../styles/common';
import { useTheme } from '../../../../util/theme';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import StyledButton from '../../../UI/StyledButton';
import SECURITY_ALERTS_TOGGLE_TEST_ID from './constants';
import { showBlockaidUI } from '../../../../util/blockaid';

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
      color: colors.text.default,
      fontSize: 20,
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
      marginTop: 18,
      fontSize: 24,
      lineHeight: 20,
    },
    desc: {
      ...(fontStyles.normal as any),
      color: colors.text.alternative,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 12,
    },
    mutedText: {
      ...(fontStyles.normal as any),
      color: colors.text.muted,
    },
    setting: {
      marginVertical: 18,
    },
    clearHistoryConfirm: {
      marginTop: 18,
    },
    switchElement: {
      display: 'flex',
      justifyContent: 'space-between',
      flexDirection: 'row',
    },
    switch: {
      alignSelf: 'flex-end',
    },
    switchLabel: {
      alignSelf: 'flex-start',
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
  const isFullScreenModal = route?.params?.isFullScreenModal;
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const dispatch = useDispatch();

  const securityAlertsEnabled = useSelector(
    (state: any) => state.experimentalSettings.securityAlertsEnabled,
  );

  const toggleSecurityAlertsEnabled = () => {
    dispatch(setSecurityAlertsEnabled(!securityAlertsEnabled));
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
      <Text style={styles.title}>
        {strings('experimental_settings.wallet_connect_dapps')}
      </Text>
      <Text style={styles.desc}>
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
      <Text style={[styles.title, styles.heading]}>
        {strings('app_settings.security_heading')}
      </Text>
      <View style={styles.setting}>
        <Text style={styles.title}>
          {strings('experimental_settings.security_alerts')}
        </Text>
        <Text style={styles.desc}>
          {strings('experimental_settings.security_alerts_desc')}
        </Text>
        <Text style={[styles.title, styles.boldTitle]}>
          {strings('experimental_settings.select_providers')}
        </Text>
      </View>
      <View style={styles.switchElement}>
        <Text style={[styles.switchLabel, styles.title]}>
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
      <Text style={[styles.title, styles.mutedText]}>
        {strings('experimental_settings.moreProviders')}
      </Text>
    </>
  );

  return (
    <ScrollView style={styles.wrapper}>
      <WalletConnectSettings />
      {showBlockaidUI() && <BlockaidSettings />}
    </ScrollView>
  );
};

export default ExperimentalSettings;
