import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../../../../locales/i18n';
import Logger from '../../../util/Logger';
import { useTheme } from '../../../util/theme';

import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import { getNavigationOptionsTitle } from '../../../components/UI/Navbar';
import { SDKConnect, Connection } from '../../../core/SDKConnect/SDKConnect';
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
  const safeAreaInsets = useSafeAreaInsets();
  // const dispatch = useDispatch();
  const sdk = SDKConnect.getInstance();
  const { colors } = useTheme();
  const styles = createStyles(colors, safeAreaInsets);
  const [connected, setConnected] = useState<Connection[]>([]);

  const refreshSDKState = () => {
    const _connected = sdk.getConnected();
    const connectedList = Object.values(_connected);
    Logger.log(
      `SDKSEssionManager::refreshSDKState connectedList=${connectedList.length}`,
    );
    setConnected(connectedList);
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
    // should listen for changes in connection state -- switch to redux
    refreshSDKState();
    updateNavBar();
    // const listenerId = sdk.registerEventListener((eventName: string) => {
    //   Logger.log(`SDKSEssionManager::useEffect event=${eventName}`);
    //   refreshSDKState();
    // });

    return () => {
      //   sdk.removeEventListener(listenerId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          sdk.removeAll();
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
    </View>
  );
};
export default SDKSessionsManager;
