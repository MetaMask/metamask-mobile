import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextStyle, View } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';

import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import ActionModal from '../../../components/UI/ActionModal';
import { getNavigationOptionsTitle } from '../../../components/UI/Navbar';
import {
  ConnectionProps,
  SDKConnect,
} from '../../../core/SDKConnect/SDKConnect';
import StyledButton from '../../UI/StyledButton';
import SDKSessionItem from './SDKSessionItem';
import { ThemeTypography } from '@metamask/design-tokens/dist/js/typography';

interface Props {
  navigation: StackNavigationProp<{
    [route: string]: { screen: string };
  }>;
}

const createStyles = (
  colors: ThemeColors,
  typography: ThemeTypography,
  _safeAreaInsets: EdgeInsets,
) =>
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
      ...typography.sHeadingSMRegular,
      textAlign: 'center',
    } as TextStyle,
    emptyNotice: {
      ...typography.sBodyMD,
    } as TextStyle,
    modalTitle: {
      ...typography.lBodyMDBold,
      textAlign: 'center',
      marginBottom: 20,
    } as TextStyle,
    disconnectAllContainer: {
      borderColor: colors.error.default,
    },
    disconnectAllFont: { color: colors.error.default },
    title: {
      fontSize: 30,
    },
  });

const SDKSessionsManager = (props: Props) => {
  const [showClearMMSDKConnectionsModal, setShowClearMMSDKConnectionsModal] =
    useState(false);
  const safeAreaInsets = useSafeAreaInsets();
  const sdk = SDKConnect.getInstance();
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography, safeAreaInsets);
  const [connections, setConnections] = useState<ConnectionProps[]>([]);

  const toggleClearMMSDKConnectionModal = () => {
    setShowClearMMSDKConnectionsModal((show) => !show);
  };

  const clearMMSDKConnections = async () => {
    toggleClearMMSDKConnectionModal();
    sdk.removeAll();
    setConnections([]);
  };

  useEffect(() => {
    const refreshSDKState = () => {
      const _connections = sdk.getConnections();
      const connectionsList = Object.values(_connections);
      // Sort connection by validity
      connectionsList.sort((a, b) => b.validUntil - a.validUntil);
      setConnections(connectionsList);
    };

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
    sdk.on('refresh', refreshSDKState);
    refreshSDKState();

    return () => {
      sdk.off('refresh', refreshSDKState);
    };
  }, [sdk, colors, props]);

  const onDisconnect = (channelId: string) => {
    setConnections([]);
    sdk.removeChannel(channelId, true);
  };

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
      <ScrollView>
        {connections.map((sdkSession, _index) => (
          <SDKSessionItem
            key={`s${_index}`}
            connection={sdkSession}
            onDisconnect={(channelId: string) => {
              onDisconnect(channelId);
            }}
          />
        ))}
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
    <Text style={styles.emptyNotice}>{strings('sdk.no_connections')}</Text>
  );

  return (
    <View style={styles.wrapper} testID={'sdk-session-manager'}>
      {connections.length > 0 ? renderSDKSessions() : renderEmptyResult()}
      {renderMMSDKConnectionsModal()}
    </View>
  );
};
export default SDKSessionsManager;
