// Third party dependencies
import React, { useMemo, useRef } from 'react';

// External dependencies
import type { ThemeColors, ThemeTypography } from '@metamask/design-tokens';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StyleSheet, View } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootParamList } from '../../../../util/navigation/types';
import { useSelector } from 'react-redux';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Button, {
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { removePermittedAccounts } from '../../../../core/Permissions';
import SDKConnect from '../../../../core/SDKConnect/SDKConnect';
import SDKConnectV2 from '../../../../core/SDKConnectV2';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import Routes from '../../../../constants/navigation/Routes';
import { RootState } from '../../../../reducers';

const createStyles = (
  _colors: ThemeColors,
  _typography: ThemeTypography,
  _safeAreaInsets: EdgeInsets,
) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 16,
    },
    btn: {
      width: '100%',
    },
  });

type SDKDisconnectModalRouteProp = RouteProp<RootParamList, 'SDKDisconnect'>;

const SDKDisconnectModal = () => {
  const route = useRoute<SDKDisconnectModalRouteProp>();
  const { channelId, account, accountsLength, accountName, dapp, isV2 } =
    route.params ?? {};

  const { v2Connections } = useSelector((state: RootState) => state.sdk);

  const sheetRef = useRef<BottomSheetRef>(null);
  const safeAreaInsets = useSafeAreaInsets();
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography, safeAreaInsets);
  const { navigate } = useNavigation();

  const { title, description } = useMemo(() => {
    let _title, _description;

    if (account) {
      _title = 'sdk_disconnect_modal.disconnect_account';
      _description = 'sdk_disconnect_modal.disconnect_account_desc';
    } else if (channelId) {
      _title = 'sdk_disconnect_modal.disconnect_all_accounts';
      _description = 'sdk_disconnect_modal.disconnect_all_accounts_desc';
    } else {
      _title = 'sdk_disconnect_modal.disconnect_all';
      _description = 'sdk_disconnect_modal.disconnect_all_desc';
    }

    return { title: _title, description: _description };
  }, [channelId, account]);

  const onConfirm = async () => {
    try {
      const isGlobalDisconnect = !account && !channelId; // Disconnect all sessions.
      const isSessionDisconnect = !account && channelId; // Disconnect a specific session.
      const isAccountDisconnect = account && channelId; // Disconnect a specific account under a session.

      if (isGlobalDisconnect) {
        // Disconnect all V1 sessions.
        SDKConnect.getInstance().removeAll();
        // Disconnect all V2 sessions.
        const v2ConnectionIds = Object.keys(v2Connections || {});
        const promises = v2ConnectionIds.map((connId) =>
          SDKConnectV2.disconnect(connId),
        );
        await Promise.all(promises);
      } else if (isSessionDisconnect) {
        if (isV2) {
          await SDKConnectV2.disconnect(channelId as string);
        } else {
          SDKConnect.getInstance().removeChannel({
            channelId: channelId as string,
            sendTerminate: true,
          });
        }
      } else if (isAccountDisconnect) {
        // This is a pure permission management action.
        removePermittedAccounts(channelId as string, [account]);
        // If it's the last account, escalate to a full session termination.
        if (accountsLength && accountsLength <= 1) {
          if (isV2) {
            await SDKConnectV2.disconnect(channelId as string);
          } else {
            SDKConnect.getInstance().removeChannel({
              channelId: channelId as string,
              sendTerminate: true,
            });
          }
        }
      }
    } catch (error) {
      DevLogger.log('Failed to perform disconnect action', error);
    } finally {
      navigate(Routes.SETTINGS.SDK_SESSIONS_MANAGER, { trigger: Date.now() });
    }
  };

  const onCancel = () => {
    navigate(Routes.SETTINGS.SDK_SESSIONS_MANAGER);
  };

  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.container}>
        <BottomSheetHeader>
          <Text variant={TextVariant.HeadingMD}>{strings(title)}</Text>
        </BottomSheetHeader>
        <Text variant={TextVariant.BodyMD}>
          {strings(description, { account: accountName, dapp })}
        </Text>
        <Button
          label={strings('sdk_disconnect_modal.disconnect_confirm')}
          style={styles.btn}
          variant={ButtonVariants.Primary}
          onPress={onConfirm}
        />
        <Button
          label={strings('sdk_disconnect_modal.cancel')}
          style={styles.btn}
          variant={ButtonVariants.Secondary}
          onPress={onCancel}
        />
      </View>
    </BottomSheet>
  );
};

export default SDKDisconnectModal;
