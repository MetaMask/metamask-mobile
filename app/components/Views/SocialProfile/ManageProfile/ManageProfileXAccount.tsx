import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { strings } from '../../../../../locales/i18n';
import { useXAuth } from '../../../../hooks/useXAuth';
import { CommonSelectorsIDs } from '../../../../util/Common.testIds';
import { ManageProfileSelectorsIDs } from './ManageProfile.testIds';
import ProfileAvatar from './ProfileAvatar';
import DisconnectXAccountSheet from './DisconnectXAccountSheet';

const AVATAR_SIZE = 72;

/** Shows the linked X account and lets the user disconnect it. */
const ManageProfileXAccount = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { isConnected, xProfile, isDisconnecting, disconnect, refresh } =
    useXAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const hasRequestedRefresh = useRef(false);

  const needsRefresh = isConnected && !xProfile;

  useEffect(() => {
    if (needsRefresh && !hasRequestedRefresh.current) {
      hasRequestedRefresh.current = true;
      refresh().catch(() => undefined);
    }
  }, [needsRefresh, refresh]);

  useEffect(() => {
    if (!isConnected && !isDisconnecting && !isSheetOpen) {
      navigation.goBack();
    }
  }, [isConnected, isDisconnecting, isSheetOpen, navigation]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleOpenSheet = useCallback(() => {
    setIsSheetOpen(true);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setIsSheetOpen(false);
  }, []);

  const handleConfirmDisconnect = useCallback(async () => {
    const result = await disconnect();
    if (!result) {
      navigation.goBack();
    }
    return result;
  }, [disconnect, navigation]);

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
          onPress={handleOpenSheet}
          testID={ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_BUTTON}
        >
          {strings('manage_profile.x_account_disconnect')}
        </Button>
      </Box>
      {isSheetOpen ? (
        <DisconnectXAccountSheet
          handle={username}
          isDisconnecting={isDisconnecting}
          onClose={handleCloseSheet}
          onConfirm={handleConfirmDisconnect}
        />
      ) : null}
    </SafeAreaView>
  );
};

export default ManageProfileXAccount;
