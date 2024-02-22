import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';

import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import { ThemeTypography } from '@metamask/design-tokens/dist/js/typography';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import Button, {
  ButtonVariants,
} from '../../../../app/component-library/components/Buttons/Button';
import Icon, {
  IconName,
  IconSize,
} from '../../../../app/component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../app/component-library/components/Texts/Text';
import Routes from '../../../../app/constants/navigation/Routes';
import { SDKSelectorsIDs } from '../../../../e2e/selectors/Settings/SDK.selectors';
import { getNavigationOptionsTitle } from '../../../components/UI/Navbar';
import { AndroidClient } from '../../../core/SDKConnect/AndroidSDK/android-sdk-types';
import { ConnectionProps } from '../../../core/SDKConnect/Connection';
import { SDKConnect } from '../../../core/SDKConnect/SDKConnect';
import SDKSessionItem from './SDKSessionItem';

interface SDKSessionsManagerProps {
  navigation: StackNavigationProp<any>;
}

const createStyles = (
  colors: ThemeColors,
  _typography: ThemeTypography,
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
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
    },
    btnAction: {
      width: '100%',
    },
    centerAlign: {
      textAlign: 'center',
    },
    disconnectAllContainer: {},
  });

const SDKSessionsManager = (props: SDKSessionsManagerProps) => {
  const safeAreaInsets = useSafeAreaInsets();
  const route =
    useRoute<RouteProp<{ params: { trigger?: number } }, 'params'>>();

  const sdk = SDKConnect.getInstance();
  const { trigger } = route.params ?? { trigger: undefined };
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography, safeAreaInsets);
  const [connections, setConnections] = useState<ConnectionProps[]>([]);
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [androidConnections, setAndroidConnections] = useState<AndroidClient[]>(
    [],
  );
  const { navigate } = useNavigation();

  const toggleClearMMSDKConnectionModal = useCallback(() => {
    navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SDK_DISCONNECT,
    });
  }, [navigate]);

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

  const renderSDKSessions = useCallback(
    () => (
      <>
        <ScrollView>
          {connections.map((sdkSession, _index) => (
            <SDKSessionItem
              key={sdkSession.id}
              connected={connectedIds.includes(sdkSession.id)}
              trigger={trigger}
              connection={sdkSession}
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
            />
          ))}
        </ScrollView>
        <View style={styles.disconnectAllContainer}>
          <Button
            variant={ButtonVariants.Secondary}
            label={strings('sdk.disconnect_all')}
            style={styles.btnAction}
            onPress={() => {
              toggleClearMMSDKConnectionModal();
            }}
          />
        </View>
      </>
    ),
    [
      connectedIds,
      trigger,
      connections,
      androidConnections,
      styles,
      toggleClearMMSDKConnectionModal,
    ],
  );

  const renderEmptyResult = () => (
    <View style={styles.emptyContainer}>
      <Icon name={IconName.Global} size={IconSize.Xl} />
      <Text variant={TextVariant.HeadingSM}>
        {strings('sdk.no_connections')}
      </Text>
      <Text variant={TextVariant.BodyMD} style={styles.centerAlign}>
        {strings('sdk.no_connections_desc')}
      </Text>
    </View>
  );

  return (
    <View
      style={styles.wrapper}
      testID={SDKSelectorsIDs.SESSION_MANAGER_CONTAINER}
    >
      {connections.length + androidConnections.length > 0
        ? renderSDKSessions()
        : renderEmptyResult()}
    </View>
  );
};
export default SDKSessionsManager;
