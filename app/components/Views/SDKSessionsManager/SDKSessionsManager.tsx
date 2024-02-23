import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextStyle, View } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';

import type { ThemeColors } from '@metamask/design-tokens/dist/types/js/themes/types';
import type { ThemeTypography } from '@metamask/design-tokens/dist/types/js/typography';
import { SDKSelectorsIDs } from '../../../../e2e/selectors/Settings/SDK.selectors';
import ActionModal from '../../../components/UI/ActionModal';
import { getNavigationOptionsTitle } from '../../../components/UI/Navbar';
import { AndroidClient } from '../../../core/SDKConnect/AndroidSDK/android-sdk-types';
import { ConnectionProps } from '../../../core/SDKConnect/Connection';
import { SDKConnect } from '../../../core/SDKConnect/SDKConnect';
import StyledButton from '../../UI/StyledButton';
import SDKSessionItem from './SDKSessionItem';

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
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [androidConnections, setAndroidConnections] = useState<AndroidClient[]>(
    [],
  );

  const toggleClearMMSDKConnectionModal = () => {
    setShowClearMMSDKConnectionsModal((show) => !show);
  };

  const clearMMSDKConnections = async () => {
    toggleClearMMSDKConnectionModal();
    sdk.removeAll();
  };

  useEffect(() => {
    const refreshSDKState = async () => {
      const _connections = sdk.getConnections();
      const _connected = sdk.getConnected();
      setConnectedIds(
        Object.values(_connected)
          .filter((connectionSource) => connectionSource.isReady)
          .map((connectionSource) => connectionSource.channelId),
      );

      const connectionsList = Object.values(_connections);

      try {
        const _androidConnections = sdk.getAndroidConnections() ?? [];
        setAndroidConnections(_androidConnections);
      } catch (error) {
        console.error('Failed to load Android connections:', error);
      }
      // Sort connection by validity
      connectionsList.sort((a, b) => {
        // Provide a fallback value (e.g., 0) if 'validUntil' is undefined
        const aValue = a.validUntil ?? 0;
        const bValue = b.validUntil ?? 0;

        return bValue - aValue;
      });
      setConnections(connectionsList);
    };

    const { navigation } = props;
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('app_settings.manage_sdk_connections_title'),
        navigation,
        false,
        colors,
      ),
    );
    sdk.on('refresh', () => {
      refreshSDKState();
    });
    refreshSDKState();

    return () => {
      sdk.off('refresh', () => {
        refreshSDKState();
      });
    };
  }, [sdk, colors, props]);

  const onDisconnect = (channelId: string) => {
    sdk.removeChannel({ channelId, sendTerminate: true, emitRefresh: true });
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
            key={sdkSession.id}
            connected={connectedIds.includes(sdkSession.id)}
            connection={sdkSession}
            onDisconnect={(channelId: string) => {
              onDisconnect(channelId);
            }}
          />
        ))}
        {androidConnections.map((androidSession, _index) => (
          <SDKSessionItem
            key={`${_index}_${androidSession.clientId}`}
            connection={{
              id: androidSession.clientId,
              originatorInfo: androidSession.originatorInfo,
            }}
            connected={androidSession.connected}
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
    <View
      style={styles.wrapper}
      testID={SDKSelectorsIDs.SESSION_MANAGER_CONTAINER}
    >
      {connections.length + androidConnections.length > 0
        ? renderSDKSessions()
        : renderEmptyResult()}
      {renderMMSDKConnectionsModal()}
    </View>
  );
};
export default SDKSessionsManager;
