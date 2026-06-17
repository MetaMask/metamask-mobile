// Third party dependencies
import React, { useCallback, useRef } from 'react';

// External dependencies
import { View } from 'react-native';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { strings } from '../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import UntypedEngine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './AccountPermissionsConfirmRevokeAll.styles';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { ConnectedAccountsSelectorsIDs } from '../../MultichainAccounts/shared/ConnectedAccountModal.testIds';
import {
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';

interface AccountPermissionsConfirmRevokeAllProps {
  route: {
    params: {
      hostInfo: {
        metadata: { origin: string };
      };
      onRevokeAll?: () => void;
    };
  };
}

const AccountPermissionsConfirmRevokeAll = (
  props: AccountPermissionsConfirmRevokeAllProps,
) => {
  const {
    hostInfo: {
      metadata: { origin: hostname },
    },
    onRevokeAll,
  } = props.route.params;

  const { styles } = useStyles(styleSheet, {});
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Engine = UntypedEngine as any;

  const sheetRef = useRef<BottomSheetRef>(null);

  const revokeAllAccounts = useCallback(async () => {
    try {
      if (onRevokeAll) {
        await onRevokeAll();
      } else {
        await Engine.context.PermissionController.revokeAllPermissions(
          hostname,
        );
        sheetRef.current?.onCloseBottomSheet();
      }
    } catch (e) {
      Logger.log(`Failed to revoke all accounts for ${hostname}`, e);
    }
  }, [hostname, Engine.context.PermissionController, onRevokeAll]);

  const onCancel = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.container}>
        <BottomSheetHeader>
          {strings('accounts.disconnect_all')}
        </BottomSheetHeader>
        <View style={styles.descriptionContainer}>
          <Text variant={TextVariant.BodyMd}>
            {strings('accounts.reconnect_notice', {
              dappUrl: hostname,
            })}
          </Text>
        </View>
        <View style={styles.buttonsContainer}>
          <Button
            style={styles.button}
            size={ButtonSize.Lg}
            variant={ButtonVariant.Secondary}
            onPress={onCancel}
            testID="revoke-all-permissions-cancel-button"
          >
            {strings('accounts.cancel')}
          </Button>

          <Button
            style={styles.button}
            size={ButtonSize.Lg}
            variant={ButtonVariant.Primary}
            onPress={revokeAllAccounts}
            testID={
              ConnectedAccountsSelectorsIDs.CONFIRM_DISCONNECT_NETWORKS_BUTTON
            }
            isDanger
          >
            {strings('accounts.disconnect')}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
};

export default AccountPermissionsConfirmRevokeAll;
