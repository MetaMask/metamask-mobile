// Third party dependencies
import React, { useCallback, useRef } from 'react';

// External dependencies
import { View } from 'react-native';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import UntypedEngine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './AccountPermissionsConfirmRevokeAll.styles';
import { ConnectedAccountsSelectorsIDs } from '../../../../../e2e/selectors/Browser/ConnectedAccountModal.selectors';

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
          <Text variant={TextVariant.HeadingMD}>
            {strings('accounts.disconnect_all')}
          </Text>
        </BottomSheetHeader>
        <View style={styles.descriptionContainer}>
          <Text variant={TextVariant.BodyMD}>
            {strings('accounts.reconnect_notice', {
              dappUrl: hostname,
            })}
          </Text>
        </View>
        <View style={styles.buttonsContainer}>
          <Button
            label={strings('accounts.cancel')}
            style={styles.button}
            size={ButtonSize.Lg}
            variant={ButtonVariants.Secondary}
            onPress={onCancel}
            testID="revoke-all-permissions-cancel-button"
          />

          <Button
            label={strings('accounts.disconnect')}
            style={styles.button}
            size={ButtonSize.Lg}
            variant={ButtonVariants.Primary}
            onPress={revokeAllAccounts}
            testID={
              ConnectedAccountsSelectorsIDs.CONFIRM_DISCONNECT_NETWORKS_BUTTON
            }
            isDanger
          />
        </View>
      </View>
    </BottomSheet>
  );
};

export default AccountPermissionsConfirmRevokeAll;
