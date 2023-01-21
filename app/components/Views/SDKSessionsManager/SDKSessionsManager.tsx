import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import Logger from '../../../util/Logger';
import { useTheme } from '../../../util/theme';

import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import SDKConnect, {
  Connection,
  ConnectionProps,
} from '../../../core/SDKConnect/SDKConnect';
import SDKSessionView from './SDKSessionView';

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
      backgroundColor: colors.background.alternative,
    },
    scrollView: {
      backgroundColor: colors.background.default,
    },
    title: {
      fontSize: 30,
    },
  });

const SDKSessionsManager = (props: Props) => {
  const safeAreaInsets = useSafeAreaInsets();
  // const dispatch = useDispatch();
  const { colors } = useTheme();
  const styles = createStyles(colors, safeAreaInsets);
  const [connections, setConnections] = useState<ConnectionProps[]>([]);
  const [connected, setConnected] = useState<Connection[]>([]);

  const refreshSDKState = () => {
    const _connections = SDKConnect.getConnections();
    const _connected = SDKConnect.getConnected();
    const connectionList = Object.values(_connections);
    const connectedList = Object.values(_connected);
    Logger.log(
      `SDKSEssionManager::refreshSDKState connectedList=${connectedList.length} connectionsList=${connectionList.length}`,
      _connections,
    );
    connectedList.forEach((session) => {
      Logger.log(`session: ${session.channelId}`);
    });
    setConnections(connectionList);
    setConnected(connectedList);
  };

  useEffect(() => {
    // should listen for changes in connection state -- switch to redux
    refreshSDKState();
    // SDKConnect.addEventListener((eventName: string) => {
    //   Logger.log(`event: ${eventName}`);
    //   refreshSDKState();
    // });
  }, []);

  // useEffect(() => {
  //   Logger.log(
  //     `SDKSessionManager::useEffect connections | connect change`,
  //     connections,
  //   );
  // }, [connections]);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        bounces={false}
        keyboardShouldPersistTaps={'never'}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollView}
        testID={'account-overview'}
      >
        <View>
          <Text style={styles.title}>MetaMask SDK Sessions Manager</Text>
          <TouchableOpacity
            // eslint-disable-next-line prettier/prettier, react-native/no-color-literals, react-native/no-inline-styles
            style={{
              height: 30,
              marginTop: 20,
              flexGrow: 1,
              backgroundColor: 'blue',
            }}
            onPress={() => {
              Logger.log(`SDKSessions TODO `, props);
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
              Logger.log(`connections`, connections);
              refreshSDKState();
            }}
          >
            <Text
              // eslint-disable-next-line
              style={{ color: 'white' }}
            >
              List Connections
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            // eslint-disable-next-line prettier/prettier, react-native/no-color-literals, react-native/no-inline-styles
            style={{
              height: 30,
              marginTop: 10,
              marginBottom: 10,
              width: 300,
              backgroundColor: 'blue',
            }}
            onPress={() => {
              SDKConnect.disconnectAll();
              refreshSDKState();
            }}
          >
            <Text
              // eslint-disable-next-line
              style={{ color: 'white' }}
            >
              Disconnect all
            </Text>
          </TouchableOpacity>
          <Text>Registered DAPPS: {Object.keys(connections).length}</Text>
          <Text>Active Connections: {Object.keys(connected).length}</Text>
          {connected.map((sdkSession, _index) => (
            <SDKSessionView key={`s${_index}`} connection={sdkSession} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};
export default SDKSessionsManager;
