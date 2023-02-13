import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../../../../locales/i18n';
import Logger from '../../../util/Logger';
import { useTheme } from '../../../util/theme';

import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import {
  Connection,
  ConnectionProps,
  SDKConnect,
} from '../../../core/SDKConnect/SDKConnect';
import StyledButton from '../../UI/StyledButton';
import SDKSessionView from './DebugSDKSessionView';
import { SDKSession } from 'app/core/SDKConnect/SDKStorageManager';

interface Props {
  navigation: StackNavigationProp<{
    SDKSessions: undefined;
    Home: undefined;
  }>;
}

const createStyles = (colors: ThemeColors, _safeAreaInsets: EdgeInsets) =>
  StyleSheet.create({
    wrapper: {
      paddingBottom: 0,
      display: 'flex',
      flexGrow: 1,
      alignItems: 'center',
      backgroundColor: colors.background.default,
    },
    disconnectAll: {
      // flexDirection: 'column',
      // flexGrow: 1,
      borderColor: colors.error.default,
      color: colors.error.default,
    },
    scrollView: {
      flexGrow: 1,
    },
    title: {
      fontSize: 30,
    },
  });

const DebugSDKSessionsManager = (props: Props) => {
  const safeAreaInsets = useSafeAreaInsets();
  // const dispatch = useDispatch();
  const { colors } = useTheme();
  const sdk = SDKConnect.getInstance();

  const styles = createStyles(colors, safeAreaInsets);
  const [connections, setConnections] = useState<ConnectionProps[]>([]);

  const refreshSDKState = () => {
    const _connections = sdk.getConnections();
    const connectionsList = Object.values(_connections);
    Logger.log(
      `SDKSEssionManager::refreshSDKState connectedList=${connectionsList.length}`,
    );
    setConnections(connectionsList);
  };

  useEffect(() => {
    // should listen for changes in connection state -- switch to redux
    refreshSDKState();
    const _handle = () => {
      refreshSDKState();
    };
    sdk.on('refresh', _handle);

    return () => {
      sdk.removeListener('refresh', _handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.wrapper}>
      <View>
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps={'never'}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollView}
          testID={'account-overview'}
        >
          <View>
            <TouchableOpacity
              // eslint-disable-next-line prettier/prettier, react-native/no-color-literals, react-native/no-inline-styles
              style={{
                height: 30,
                marginTop: 20,
                flexGrow: 1,
                backgroundColor: 'blue',
              }}
              onPress={() => {
                // Logger.log(`SDKSessions TODO `, props);
                const navigation = props.navigation;
                navigation.navigate('Home');
              }}
            >
              <Text
                // eslint-disable-next-line
                style={{ color: 'white' }}
              >
                Back to Main Page
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              // eslint-disable-next-line prettier/prettier, react-native/no-color-literals, react-native/no-inline-styles
              style={{
                height: 30,
                marginTop: 20,
                flexGrow: 1,
                marginBottom: 20,
                backgroundColor: 'blue',
              }}
              onPress={() => {
                Logger.log(`connections`, connections.length);
                refreshSDKState();
                const sessions = SDKConnect.getInstance().getSessionsStorage();
                Logger.log(`sessions: `, JSON.stringify(sessions, null, 4));
              }}
            >
              <Text
                // eslint-disable-next-line
                style={{ color: 'white' }}
              >
                List Connections (storage)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              // eslint-disable-next-line prettier/prettier, react-native/no-color-literals, react-native/no-inline-styles
              style={{
                height: 30,
                marginTop: 20,
                flexGrow: 1,
                marginBottom: 20,
                backgroundColor: 'blue',
              }}
              onPress={() => {
                const hosts = sdk.getApprovedHosts('debug');
                Logger.log(
                  `Approved Hosts [${Object.keys(hosts).length}]`,
                  hosts,
                );
              }}
            >
              <Text
                // eslint-disable-next-line
                style={{ color: 'white' }}
              >
                Approved Hosts
              </Text>
            </TouchableOpacity>
            {connections.map((connectionProps, _index) => (
              <SDKSessionView
                key={`s${_index}`}
                connection={sdk.getConnected()[connectionProps.id]}
                originator={connections[_index].originatorInfo}
              />
            ))}
          </View>
        </ScrollView>
        <StyledButton
          type="normal"
          onPress={() => {
            sdk.removeAll();
            refreshSDKState();
          }}
          style={styles.disconnectAll}
          // fontStyle={styles.disconnectAll}
        >
          {strings('sdk.disconnect_all')}
        </StyledButton>
      </View>
    </SafeAreaView>
  );
};
export default DebugSDKSessionsManager;
