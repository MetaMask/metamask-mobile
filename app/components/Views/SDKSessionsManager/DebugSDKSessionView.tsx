/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import {
  ConnectionStatus,
  EventType,
  OriginatorInfo,
  ServiceStatus,
} from '@metamask/sdk-communication-layer';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Connection, SDKConnect } from '../../../core/SDKConnect/SDKConnect';
import Logger from '../../../util/Logger';
import { useTheme } from '../../../util/theme';

interface SDKSessionViewProps {
  connection: Connection;
  originator?: OriginatorInfo;
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

export const SDKSessionView = ({ connection, originator }: SDKSessionViewProps) => {
  const { colors } = useTheme();
  const sdk = SDKConnect.getInstance();
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>(
    connection.remote.getServiceStatus(),
  );
  const status =
    serviceStatus.connectionStatus ?? ConnectionStatus.DISCONNECTED;

  const [styles, setStyles] = useState(createStyles(colors, status));
  const [approved, setApproved] = useState(
    sdk.isApproved({ channelId: connection.channelId }),
  );

  const hasPauseAction =
    (status !== ConnectionStatus.PAUSED &&
      status === ConnectionStatus.LINKED) ||
    status === ConnectionStatus.WAITING;
  const hasResumeAction = true;
  const hasRemoveAction = true;
  // const hasReconnectAction = true;
  // const hasDisconnectAction = true;

  const onRemoteEvent = (_status: ServiceStatus) => {
    setServiceStatus(_status);
    Logger.log(
      `DebugSDKSessionView::onRemoteEvent channel=${connection.channelId}`,
      _status,
    );
    setApproved(sdk.isApproved({ channelId: connection.channelId }));
    setStyles(
      createStyles(
        colors,
        _status.connectionStatus ?? ConnectionStatus.DISCONNECTED,
      ),
    );
  };

  useEffect(() => {
    connection.remote.on(EventType.SERVICE_STATUS, onRemoteEvent);
    return () => {
      connection.remote.removeListener(EventType.SERVICE_STATUS, onRemoteEvent);
    };
  });

  const formatRemainingTime = () => {
    if (serviceStatus?.channelConfig?.validUntil) {
      const validUntil = new Date(serviceStatus?.channelConfig?.validUntil);
      return validUntil.toLocaleDateString();
    }
    return 'Not set';
  };

  return (
    <View style={styles.container}>
      {/* <Text>{connection.originatorInfo?.platform}</Text>
      <Text>{connection.originatorInfo?.title}</Text> */}
      {/* <Text>{JSON.stringify(connection.remote.getKeyInfo())}</Text> */}
      <Text>originator: {JSON.stringify(originator)}</Text>
      <Text>key_exchange_step: {serviceStatus?.keyInfo?.step}</Text>
      <Text>key_exchanged: {serviceStatus?.keyInfo?.keysExchanged + ''}</Text>
      <View style={{ padding: 5 }}>
        <Text>MM Public Key: </Text>
        <Text style={{ color: '#5f9ea0' }}>
          {serviceStatus?.keyInfo?.ecies.public}
        </Text>
        <Text>MM Private Key: </Text>
        <Text style={{ color: '#5f9ea0' }}>
          {serviceStatus?.keyInfo?.ecies.private}
        </Text>
        <Text>Dapp Public Key: </Text>
        <Text style={{ color: '#5f9ea0' }}>
          {serviceStatus?.keyInfo?.ecies.otherPubKey}
        </Text>
      </View>
      <Text>
        {`========>       ${
          approved ? 'APPROVED' : 'NOT APPROVED'
        }      <=========`}
      </Text>
      <Text>Channel: {serviceStatus?.channelId}</Text>
      <Text>{`Expiration: ${formatRemainingTime()}`}</Text>
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
        // eslint-disable-next-line prettier/prettier, react-native/no-color-literals, react-native/no-inline-styles
        style={{
          height: 30,
          marginTop: 20,
          flexGrow: 1,
          marginBottom: 20,
          backgroundColor: 'blue',
        }}
        onPress={() => {
          // connection.remote.testStorage();
          const sessions = SDKConnect.getInstance().getSessionsStorage();
          Logger.log(`sessions: `, JSON.stringify(sessions, null, 4));
          // const s = connection.remote.getServiceStatus();
          // Logger.log(`s`, JSON.stringify(s, null, 4));
        }}
      >
        <Text
          // eslint-disable-next-line
          style={{ color: 'white' }}
        >
          Test Storage
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          Logger.log(connection.remote.getKeyInfo());
        }}
      >
        <Text style={styles.buttonText}>Print KeyInfo</Text>
      </TouchableOpacity>
      {approved ? (
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            sdk.disapprove(connection.channelId);
            setApproved(false);
          }}
        >
          <Text style={styles.buttonText}>Disapprove Channel</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            sdk.revalidateChannel({ channelId: connection.channelId });
            setApproved(true);
          }}
        >
          <Text style={styles.buttonText}>Approve Channel</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          connection.remote.ping();
        }}
      >
        <Text style={styles.buttonText}>Ping</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          Logger.log(connection.remote.getServiceStatus());
          Logger.log(`isConnected()=${connection.remote.isConnected()}`);
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
      {/* {hasReconnectAction && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            // disconnect then reconnect
            connection.pause();
            sdk.reconnect({ channelId: connection.channelId });
          }}
        >
          <Text style={styles.buttonText}>Reconnect</Text>
        </TouchableOpacity>
      )} */}
      {/* {hasDisconnectAction && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            connection.disconnect();
          }}
        >
          <Text style={styles.buttonText}>Disconnect</Text>
        </TouchableOpacity>
      )} */}
      {hasRemoveAction && (
        <TouchableOpacity
          style={[styles.button, styles.removeButton]}
          onPress={() => {
            sdk.removeChannel(connection.channelId);
          }}
        >
          <Text style={styles.buttonText}>Remove</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default SDKSessionView;
