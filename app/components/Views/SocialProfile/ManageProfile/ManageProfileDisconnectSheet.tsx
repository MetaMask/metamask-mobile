import React, { useCallback, useRef, useState } from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  ButtonSize,
  ButtonsAlignment,
  TitleAlert,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import type { XProfile } from '../../../../core/XAuthService';
import { ManageProfileSelectorsIDs } from './ManageProfile.testIds';

interface ManageProfileDisconnectSheetProps {
  /** The linked X profile named in the confirmation copy, when known. */
  xProfile: XProfile | undefined;
  /**
   * Performs the disconnect. Must resolve only on success — a rejection keeps
   * the sheet open so the user can retry (the failure itself is surfaced by
   * the caller, e.g. as a toast).
   */
  onDisconnect: () => Promise<void>;
  /** Called once the sheet has finished animating out, by any route. */
  onClose: () => void;
}

/**
 * Destructive-action confirmation for unlinking the connected X account,
 * built on the screen's field-sheet primitives and the app's TitleAlert
 * alert-dialog pattern (see ManageAccounts' RemoveAccount sheet). The
 * Disconnect control locks with "Disconnecting…" while the request is in
 * flight and the sheet animates out only once it resolves.
 */
const ManageProfileDisconnectSheet = ({
  xProfile,
  onDisconnect,
  onClose,
}: ManageProfileDisconnectSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const isDisconnectingRef = useRef(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDismiss = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleDisconnect = useCallback(async () => {
    // Double-press guard: the button is disabled while disconnecting, but a
    // rapid second tap can re-enter before the disabled state commits — so
    // the ref, not the state, is the source of truth.
    if (isDisconnectingRef.current) {
      return;
    }
    isDisconnectingRef.current = true;
    setIsDisconnecting(true);
    try {
      await onDisconnect();
      sheetRef.current?.onCloseBottomSheet();
    } catch {
      // onDisconnect surfaces the failure; stay open for a retry.
    } finally {
      isDisconnectingRef.current = false;
      setIsDisconnecting(false);
    }
  }, [onDisconnect]);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={onClose}
      testID={ManageProfileSelectorsIDs.LINKED_ACCOUNT_SHEET}
    >
      <BottomSheetHeader
        onClose={handleDismiss}
        closeButtonProps={{
          testID: ManageProfileSelectorsIDs.LINKED_ACCOUNT_SHEET_CLOSE,
        }}
      >
        {strings('app_settings.manage_profile.linked_social_account')}
      </BottomSheetHeader>

      <TitleAlert
        severity="danger"
        title={
          xProfile
            ? strings(
                'app_settings.manage_profile.disconnect_x_title_with_handle',
                { handle: `@${xProfile.username}` },
              )
            : strings('app_settings.manage_profile.disconnect_x_title')
        }
        description={strings(
          'app_settings.manage_profile.disconnect_x_description',
        )}
        twClassName="px-4 pt-2 pb-4"
        testID={ManageProfileSelectorsIDs.LINKED_ACCOUNT_SHEET_ALERT}
      />

      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Vertical}
        primaryButtonProps={{
          children: isDisconnecting
            ? strings('app_settings.manage_profile.disconnecting')
            : strings('app_settings.manage_profile.disconnect_x_cta'),
          size: ButtonSize.Lg,
          isFullWidth: true,
          isDanger: true,
          isDisabled: isDisconnecting,
          onPress: handleDisconnect,
          testID: ManageProfileSelectorsIDs.LINKED_ACCOUNT_SHEET_DISCONNECT,
        }}
        secondaryButtonProps={{
          children: strings('app_settings.manage_profile.cancel'),
          size: ButtonSize.Lg,
          isFullWidth: true,
          onPress: handleDismiss,
          testID: ManageProfileSelectorsIDs.LINKED_ACCOUNT_SHEET_CANCEL,
        }}
      />
    </BottomSheet>
  );
};

export default ManageProfileDisconnectSheet;
