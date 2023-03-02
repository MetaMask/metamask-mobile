import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import { fontStyles } from '../../../styles/common';

import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import { getNavigationOptionsTitle } from '../../../components/UI/Navbar';
import { SDKConnect, Connection } from '../../../core/SDKConnect/SDKConnect';
import StyledButton from '../../UI/StyledButton';
import SDKSessionItem from './SDKSessionItem';
import ActionModal from '../../../components/UI/ActionModal';

interface Props {
  navigation: StackNavigationProp<{
    SDKSessions: undefined;
    Home: undefined;
  }>;
}

const createStyles = (colors: ThemeColors, _safeAreaInsets: EdgeInsets) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 24,
      marginBottom: 24,
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
    disconnectAllContainer: {
      borderColor: colors.error.default,
    },
    disconnectAllFont: { color: colors.error.default },
    scrollView: {
      // keep in case necessary
    },
    title: {
      fontSize: 30,
    },
  });

const SDKSessionsManager = (props: Props) => {
  const [showClearMMSDKConnectionsModal, setshowClearMMSDKConnectionsModal] =
    useState(false);
  const safeAreaInsets = useSafeAreaInsets();
  const sdk = SDKConnect.getInstance();
  const { colors } = useTheme();
  const styles = createStyles(colors, safeAreaInsets);
  const [connected, setConnected] = useState<Connection[]>([]);

  const refreshSDKState = () => {
    const _connected = sdk.getConnected();
    const connectedList = Object.values(_connected);
    setConnected(connectedList);
  };

  const toggleClearMMSDKConnectionModal = () => {
    setshowClearMMSDKConnectionsModal((show) => !show);
  };

  const clearMMSDKConnections = async () => {
    sdk.removeAll();
    toggleClearMMSDKConnectionModal();
  };

  const updateNavBar = () => {
    const { navigation } = props;
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('app_settings.manage_sdk_connections_title'),
        navigation,
        false,
        colors,
        null,
      ),
    );
  };

  useEffect(() => {
    refreshSDKState();
    updateNavBar();
    const _handle = () => {
      refreshSDKState();
    };
    sdk.on('refresh', _handle);

    return () => {
      sdk.removeListener('refresh', _handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderMMSDKConnectionsModal = () => (
    <ActionModal
      modalVisible={showClearMMSDKConnectionsModal}
      confirmText={strings('app_settings.clear')}
      cancelText={strings('app_settings.reset_account_cancel_button')}
      onCancelPress={toggleClearMMSDKConnectionModal}
      onRequestClose={toggleClearMMSDKConnectionModal}
      onConfirmPress={clearMMSDKConnections}
    >
      <View style={styles.modalView}>
        <Text style={styles.modalTitle}>
          {strings('app_settings.clear_sdk_connections_title')}
        </Text>
        <Text style={styles.modalText}>
          {strings('app_settings.clear_sdk_connections_text')}
        </Text>
      </View>
    </ActionModal>
  );

  const renderSDKSessions = () => (
    <>
      <ScrollView style={styles.scrollView}>
        <View>
          {connected.map((sdkSession, _index) => (
            <SDKSessionItem key={`s${_index}`} connection={sdkSession} />
          ))}
        </View>
      </ScrollView>
      <StyledButton
        type="normal"
        onPress={() => {
          toggleClearMMSDKConnectionModal();
        }}
        containerStyle={styles.disconnectAllContainer}
        style={[styles.disconnectAllContainer, styles.disconnectAllFont]}
        fontStyle={styles.disconnectAllFont}
      >
        {strings('sdk.disconnect_all')}
      </StyledButton>
    </>
  );

  const renderEmptyResult = () => (
    <>
      <Text>{strings('sdk.no_connections')}</Text>
    </>
  );

  return (
    <View style={styles.wrapper} testID={'sdk-session-manager'}>
      {connected.length > 0 ? renderSDKSessions() : renderEmptyResult()}
      {renderMMSDKConnectionsModal()}
    </View>
  );
};
export default SDKSessionsManager;
