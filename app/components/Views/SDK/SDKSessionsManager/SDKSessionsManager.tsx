import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';

import type { ThemeColors, ThemeTypography } from '@metamask/design-tokens';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Button,
  ButtonVariant,
  HeaderStandard,
  TextColor,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Routes from '../../../../constants/navigation/Routes';
import { RootState } from '../../../../reducers';
import { SDKSelectorsIDs } from '../SDK.testIds';
import SDKSessionItem from './SDKSessionItem';

const createStyles = (
  colors: ThemeColors,
  _typography: ThemeTypography,
  _safeAreaInsets: EdgeInsets,
) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    content: {
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

const SDKSessionsManager = () => {
  const safeAreaInsets = useSafeAreaInsets();
  const route =
    useRoute<RouteProp<{ params: { trigger?: number } }, 'params'>>();

  const { connections, dappConnections, v2Connections } = useSelector(
    (state: RootState) => state.sdk,
  );

  const connectionsList = useMemo(
    () => [
      ...Object.values(connections),
      ...Object.values(dappConnections),
      ...Object.values(v2Connections),
    ],
    [connections, dappConnections, v2Connections],
  );

  const { trigger } = route.params ?? { trigger: undefined };
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography, safeAreaInsets);

  const navigation = useNavigation();

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const toggleClearMMSDKConnectionModal = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SDK_DISCONNECT,
    });
  }, [navigation]);

  const renderSDKSessions = useCallback(
    () => (
      <>
        <ScrollView>
          {connectionsList.map((sdkSession, _index) => (
            <SDKSessionItem
              key={sdkSession.id}
              trigger={trigger}
              connection={sdkSession}
            />
          ))}
        </ScrollView>
        <View style={styles.disconnectAllContainer}>
          <Button
            variant={ButtonVariant.Secondary}
            style={styles.btnAction}
            onPress={() => {
              toggleClearMMSDKConnectionModal();
            }}
          >
            {strings('sdk.disconnect_all')}
          </Button>
        </View>
      </>
    ),
    [connectionsList, trigger, styles, toggleClearMMSDKConnectionModal],
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
      <HeaderStandard
        title={strings('app_settings.manage_sdk_connections_title')}
        titleProps={{ color: TextColor.PrimaryDefault }}
        onBack={handleBack}
        includesTopInset
        testID={SDKSelectorsIDs.SESSION_MANAGER_HEADER}
        backButtonProps={{
          testID: SDKSelectorsIDs.SESSION_MANAGER_BACK_BUTTON,
        }}
      />
      <View style={styles.content}>
        {connectionsList.length > 0 ? renderSDKSessions() : renderEmptyResult()}
      </View>
    </View>
  );
};
export default SDKSessionsManager;
