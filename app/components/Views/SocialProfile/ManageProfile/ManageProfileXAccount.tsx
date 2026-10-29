import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { strings } from '../../../../../locales/i18n';
import { useXAuth } from '../../../../hooks/useXAuth';
import { CommonSelectorsIDs } from '../../../../util/Common.testIds';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { ManageProfileSelectorsIDs } from './ManageProfile.testIds';
import ProfileAvatar from './ProfileAvatar';
import DisconnectXAccountSheet from './DisconnectXAccountSheet';
import { useManageProfileAnalytics } from '../../../../hooks/useManageProfileAnalytics';

const AVATAR_SIZE = 72;

type DisconnectPhase = 'idle' | 'pending' | 'settled';

/** Shows the linked X account and lets the user disconnect it. */
const ManageProfileXAccount = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const {
    isConnected,
    xProfile,
    isDisconnecting,
    disconnectError,
    isRefreshing,
    disconnect,
    refresh,
  } = useXAuth();
  const { toastRef } = useContext(ToastContext);
  const trackProfileEdited = useManageProfileAnalytics();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  // `pending` is set by the sheet's confirm so a screen that is merely
  // disconnected does not toast. `settled` is terminal: it stops the effect
  // from toasting, or navigating, a second time when it re-runs after the latch
  // is written, and every write below refuses to rewind it. `goBack` does not
  // unmount this screen synchronously, so a rewind would toast and pop twice.
  const [disconnectPhase, setDisconnectPhase] =
    useState<DisconnectPhase>('idle');
  const [hasRequestedRefresh, setHasRequestedRefresh] = useState(false);

  const needsRefresh = isConnected && !xProfile;
  // A refresh that lands after a disconnect re-writes `xProfile`, and
  // `selectIsConnectedToX` treats any `xProfile` as connected, which would
  // resurrect the link. So disconnect is blocked from the moment a refresh is
  // due (before its effect has run) until it settles.
  const isRefreshPending =
    isRefreshing || (needsRefresh && !hasRequestedRefresh);

  useEffect(() => {
    if (!needsRefresh || hasRequestedRefresh) {
      return;
    }
    setHasRequestedRefresh(true);
    refresh().catch(() => undefined);
  }, [needsRefresh, hasRequestedRefresh, refresh]);

  useEffect(() => {
    if (isConnected || isDisconnecting) {
      return;
    }
    setIsSheetOpen(false);
    if (disconnectPhase === 'settled') {
      return;
    }
    // `disconnect` resolves void, so success is read from the controller having
    // cleared the link without recording a disconnect failure. `disconnectError`
    // is written only by `disconnect`, so a failed `refresh` of the same link
    // cannot be mistaken for a failed disconnect.
    const didDisconnect = disconnectPhase === 'pending' && !disconnectError;
    // Latch before the toast and the navigation: the outcome state that
    // released this effect is in the dependency list, so a re-run must not
    // toast, or pop the navigator, a second time.
    setDisconnectPhase('settled');
    if (didDisconnect) {
      // Unlinking X is a Manage profile edit, so it shares the same
      // `profile_edited` event as the other editors. Tracked here because this
      // screen owns the confirmed disconnect, and only on success.
      trackProfileEdited();
      // The toast is hosted by the global ToastContext, so it survives the
      // navigation back to Manage profile.
      toastRef?.current?.showToast({
        variant: ToastVariants.Plain,
        labelOptions: [
          {
            label: strings('manage_profile.x_account_disconnect_success'),
            isBold: true,
          },
        ],
        startAccessory: (
          <Box twClassName="self-start pt-1">
            <Icon
              name={IconName.Confirmation}
              size={IconSize.Lg}
              color={IconColor.SuccessDefault}
              testID={
                ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_SUCCESS_ICON
              }
            />
          </Box>
        ),
        hasNoTimeout: false,
      });
    }
    navigation.goBack();
  }, [
    disconnectError,
    disconnectPhase,
    isConnected,
    isDisconnecting,
    navigation,
    toastRef,
    trackProfileEdited,
  ]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleOpenSheet = useCallback(() => {
    if (isRefreshPending || disconnectPhase === 'settled') {
      return;
    }
    // Opening clears a failure left by the previous attempt. Phase is cleared
    // here rather than on close because the backdrop press and the pan gesture
    // bypass the sheet's `isDisconnecting` guard, and rewinding `pending`
    // mid-flight would drop the success toast and the `profile_edited` event.
    setDisconnectPhase((phase) =>
      phase === 'pending' && isDisconnecting ? phase : 'idle',
    );
    setIsSheetOpen(true);
  }, [disconnectPhase, isDisconnecting, isRefreshPending]);

  const handleCloseSheet = useCallback(() => {
    setIsSheetOpen(false);
  }, []);

  const handleConfirmDisconnect = useCallback(async () => {
    if (isRefreshPending) {
      return;
    }
    setDisconnectPhase((phase) => (phase === 'settled' ? phase : 'pending'));
    await disconnect();
  }, [disconnect, isRefreshPending]);

  const disconnectErrorMessage =
    disconnectPhase === 'pending' && disconnectError && !isDisconnecting
      ? strings('manage_profile.x_account_disconnect_error')
      : null;

  const username = xProfile?.username;

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={ManageProfileSelectorsIDs.X_ACCOUNT_SCREEN}
    >
      <HeaderStandard
        title={strings('manage_profile.x_account')}
        onBack={handleBack}
        includesTopInset
        testID={ManageProfileSelectorsIDs.X_ACCOUNT_HEADER}
        backButtonProps={{
          testID: CommonSelectorsIDs.BACK_ARROW_BUTTON,
        }}
      />
      <Box
        alignItems={BoxAlignItems.Center}
        twClassName="flex-1 px-6 pt-8"
        gap={3}
      >
        <ProfileAvatar
          size={AVATAR_SIZE}
          src={xProfile?.avatarUrl ? { uri: xProfile.avatarUrl } : undefined}
          testID={ManageProfileSelectorsIDs.X_ACCOUNT_AVATAR}
        />
        {username ? (
          <Text
            variant={TextVariant.HeadingMd}
            testID={ManageProfileSelectorsIDs.X_ACCOUNT_HANDLE}
          >
            {`@${username}`}
          </Text>
        ) : null}
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
        >
          {strings('manage_profile.x_account_disconnect_body')}
        </Text>
      </Box>
      <Box twClassName="px-4 pb-4">
        <Button
          variant={ButtonVariant.Primary}
          isDanger
          isFullWidth
          size={ButtonSize.Lg}
          isDisabled={isRefreshPending || disconnectPhase === 'settled'}
          onPress={handleOpenSheet}
          testID={ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_BUTTON}
        >
          {strings('common.disconnect')}
        </Button>
      </Box>
      {isSheetOpen ? (
        <DisconnectXAccountSheet
          handle={username}
          isDisconnecting={isDisconnecting}
          errorMessage={disconnectErrorMessage}
          onClose={handleCloseSheet}
          onConfirm={handleConfirmDisconnect}
        />
      ) : null}
    </SafeAreaView>
  );
};

export default ManageProfileXAccount;
