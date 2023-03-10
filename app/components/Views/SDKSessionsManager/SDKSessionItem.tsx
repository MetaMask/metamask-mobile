import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../../../../locales/i18n';
import { ConnectionProps } from '../../../core/SDKConnect/SDKConnect';
import { useTheme } from '../../../util/theme';
import StyledButton from '../../UI/StyledButton';

interface SDKSessionViewProps {
  connection: ConnectionProps;
  onDisconnect: (channelId: string) => void;
}

const createStyles = (colors: ThemeColors, _safeAreaInsets: EdgeInsets) =>
  StyleSheet.create({
    container: {
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
    },
    iconText: {
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
      paddingLeft: 10,
      paddingRight: 10,
    },
    disconnectFont: { color: colors.error.default, lineHeight: 24 },
  });

export const SDKSessionItem = ({
  connection,
  onDisconnect,
}: SDKSessionViewProps) => {
  const safeAreaInsets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = createStyles(colors, safeAreaInsets);
  const [sessionName, setSessionName] = useState('');
  const [icon, setIcon] = useState<string>();

  useEffect(() => {
    const _sessionName =
      connection.originatorInfo?.url ||
      connection.originatorInfo?.title ||
      strings('sdk.unkown_dapp');
    setIcon(connection.originatorInfo?.icon);
    setSessionName(_sessionName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      {icon ? (
        <Image style={styles.icon} source={{ uri: icon }} />
      ) : (
        <Text style={[styles.icon, styles.iconText]}>
          {sessionName.charAt(0).toUpperCase()}
        </Text>
      )}

      <Text style={styles.dappName}>{sessionName}</Text>
      <StyledButton
        type="normal"
        onPress={() => onDisconnect(connection.id)}
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
