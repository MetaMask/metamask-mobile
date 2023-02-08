import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import {
  ConnectionStatus,
  ServiceStatus,
  MessageType,
} from '@metamask/sdk-communication-layer';
import SDKConnect, { Connection } from '../../../core/SDKConnect/SDKConnect';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Logger from '../../../util/Logger';
import { useTheme } from '../../../util/theme';

interface SDKSessionViewProps {
  connection: Connection;
}

const createStyles = (
  colors: ThemeColors,
  connectionStatus: ConnectionStatus,
) =>
  StyleSheet.create({
    container: {
      borderWidth: 2,
      borderColor:
        connectionStatus === ConnectionStatus.LINKED
          ? colors.success.default
          : colors.warning.default,
      padding: 10,
      backgroundColor: colors.background.alternative,
    },
    button: {
      height: 30,
      marginTop: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.primary.default,
    },
    textData: {
      color: colors.primary.alternative,
    },
    buttonText: {
      color: colors.primary.inverse,
    },
    removeButton: {
      backgroundColor: colors.warning.default,
    },
  });

export const SDKSessionView = ({ connection }: SDKSessionViewProps) => {
  const { colors } = useTheme();
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>(
    connection.remote.getServiceStatus(),
  );
  const status =
    serviceStatus.connectionStatus ?? ConnectionStatus.DISCONNECTED;
  const styles = createStyles(colors, status);

  const hasPauseAction =
    (status !== ConnectionStatus.PAUSED &&
      status === ConnectionStatus.LINKED) ||
    status === ConnectionStatus.WAITING;
  const hasResumeAction = status === ConnectionStatus.PAUSED;
  const hasRemoveAction = true;
  const hasReconnectAction = true;

  useEffect(() => {
    connection.remote.on(
      MessageType.SERVICE_STATUS,
      (_status: ServiceStatus) => {
        setServiceStatus(_status);
      },
    );
  });

  return (
    <View style={styles.container}>
      {/* <Text>{connection.originatorInfo?.platform}</Text>
      <Text>{connection.originatorInfo?.title}</Text> */}
      {/* <Text>{JSON.stringify(connection.remote.getKeyInfo())}</Text> */}
      <Text>originator: {JSON.stringify(serviceStatus?.originatorInfo)}</Text>
      <Text>key_exchange_step: {serviceStatus?.keyInfo?.step}</Text>
      <Text>key_exchanged: {serviceStatus?.keyInfo?.keysExchanged + ''}</Text>
      <Text>Channel: {serviceStatus?.channelId}</Text>
      <Text>{`Expiration: ${
        serviceStatus?.channelConfig?.validUntil ?? ''
      }`}</Text>
      <Text>Status: {connection.remote.getConnectionStatus()}</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          Logger.log('request to redirects', connection.requestsToRedirect);
        }}
      >
        <Text style={styles.buttonText}>Requests Redirect</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          Logger.log(connection.remote.getKeyInfo());
        }}
      >
        <Text style={styles.buttonText}>Print KeyInfo</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          Logger.log(connection.remote.getServiceStatus());
        }}
      >
        <Text style={styles.buttonText}>Print ServiceStatus</Text>
      </TouchableOpacity>
      {hasResumeAction && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            connection.resume();
          }}
        >
          <Text style={styles.buttonText}>resume</Text>
        </TouchableOpacity>
      )}
      {hasPauseAction && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            connection.pause();
          }}
        >
          <Text style={styles.buttonText}>Pause</Text>
        </TouchableOpacity>
      )}
      {hasReconnectAction && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            // disconnect then reconnect
            connection.pause();
            SDKConnect.reconnect({ channelId: connection.channelId });
          }}
        >
          <Text style={styles.buttonText}>Reconnect</Text>
        </TouchableOpacity>
      )}
      {hasRemoveAction && (
        <TouchableOpacity
          style={[styles.button, styles.removeButton]}
          onPress={() => {
            SDKConnect.removeChannel(connection.channelId);
          }}
        >
          <Text style={styles.buttonText}>Remove</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default SDKSessionView;
