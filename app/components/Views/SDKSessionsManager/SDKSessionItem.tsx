import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import { ServiceStatus } from '@metamask/sdk-communication-layer';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../../../../locales/i18n';
import SDKConnect, { Connection } from '../../../core/SDKConnect/SDKConnect';
import { useTheme } from '../../../util/theme';
import StyledButton from '../../UI/StyledButton';

interface SDKSessionViewProps {
  connection: Connection;
}

const createStyles = (colors: ThemeColors, _safeAreaInsets: EdgeInsets) =>
  StyleSheet.create({
    container: {
      // borderWidth: 2,
      flexDirection: 'row',
      flexGrow: 1,
      alignItems: 'center',
      marginBottom: 20,
    },
    icon: {
      height: 24,
      width: 24,
      borderRadius: 12,
      borderWidth: 1,
      lineHeight: 24,
      textAlign: 'center',
    },
    dappName: {
      flexGrow: 1,
      marginLeft: 5,
      marginRight: 5,
    },
    disconnectContainer: {
      borderColor: colors.error.default,
      alignItems: 'center',
      height: 24,
      // paddingLeft: 25,
      // paddingRight: 25,
    },
    disconnectFont: { color: colors.error.default, lineHeight: 24 },
  });

export const SDKSessionItem = ({ connection }: SDKSessionViewProps) => {
  const safeAreaInsets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = createStyles(colors, safeAreaInsets);
  const [serviceStatus] = useState<ServiceStatus>(
    connection.remote.getServiceStatus(),
  );
  const [sessionName, setSessionName] = useState('');

  useEffect(() => {
    const _sessionName =
      serviceStatus.originatorInfo?.title ||
      serviceStatus.originatorInfo?.url ||
      strings('sdk.unkown_dapp');
    setSessionName(_sessionName);
  }, [serviceStatus]);

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{sessionName.charAt(0)}</Text>
      <Text style={styles.dappName}>{sessionName}</Text>
      <StyledButton
        type="normal"
        onPress={() => {
          SDKConnect.removeChannel(connection.channelId);
        }}
        containerStyle={styles.disconnectContainer}
        style={[styles.disconnectContainer, styles.disconnectFont]}
        fontStyle={styles.disconnectFont}
      >
        {strings('sdk.disconnect')}
      </StyledButton>
    </View>
  );
};

export default SDKSessionItem;
