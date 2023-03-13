import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../../../../locales/i18n';
import { fontStyles } from '../../../styles/common';
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
  const [connections, setConnections] = useState<ConnectionProps[]>([]);

  const refreshSDKState = useCallback(() => {
    const _connections = sdk.getConnections();
    const connectionsList = Object.values(_connections);
    setConnections(connectionsList);
  }, [sdk]);

  const toggleClearMMSDKConnectionModal = () => {
    setshowClearMMSDKConnectionsModal((show) => !show);
  };

  const clearMMSDKConnections = async () => {
    toggleClearMMSDKConnectionModal();
    sdk.removeAll();
    setConnections([]);
  };

  useEffect(() => {
    refreshSDKState();
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
  }, [refreshSDKState, colors, props]);

  const onDisconnect = (channelId: string) => {
    // TODO why do we need to timeout otherwise
    setConnections([]);
    sdk.removeChannel(channelId, true);

    setTimeout(() => {
      refreshSDKState();
    }, 100);
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

  const renderEmptyResult = () => <Text>{strings('sdk.no_connections')}</Text>;

  return (
    <View style={styles.wrapper} testID={'sdk-session-manager'}>
      {connections.length > 0 ? renderSDKSessions() : renderEmptyResult()}
      {renderMMSDKConnectionsModal()}
    </View>
  );
};
export default SDKSessionsManager;
