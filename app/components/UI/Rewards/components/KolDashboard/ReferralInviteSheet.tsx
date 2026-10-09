import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Box,
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
import { KOL_INVITE_FIXTURE } from './rewardsUiFixtures';
import ReferralInviteCodeField from './ReferralInviteCodeField';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

interface ReferralInviteSheetProps {
  isVisible: boolean;
  referralCode: string;
  /** Receives the code the user accepted, which they may have edited. */
  onAccept: (referralCode: string) => void;
  onDecline: () => void;
  /** Dismisses the sheet without accepting or declining. */
  onClose: () => void;
}

const ReferralInviteSheet: React.FC<ReferralInviteSheetProps> = ({
  isVisible,
  referralCode: initialReferralCode,
  onAccept,
  onDecline,
  onClose,
}) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const [referralCode, setReferralCode] = useState(initialReferralCode);

  useEffect(() => {
    if (isVisible) {
      setReferralCode(initialReferralCode);
    }
  }, [initialReferralCode, isVisible]);

  const handleDecline = useCallback(() => {
    onDecline();
  }, [onDecline]);

  const handleAccept = useCallback(() => {
    onAccept(referralCode);
  }, [onAccept, referralCode]);

  if (!isVisible) {
    return null;
  }

  return (
    // Matches ShareCodeSheet: BottomSheet lays itself out `absolute inset-0`, so
    // a full-screen Modal gives its overlay the whole surface to dim.
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <BottomSheet
            ref={sheetRef}
            onClose={onClose}
            testID={KOL_DASHBOARD_SELECTORS.INVITE_SHEET}
          >
            <BottomSheetHeader
              onClose={onClose}
              closeButtonProps={{
                testID: KOL_DASHBOARD_SELECTORS.INVITE_CLOSE,
              }}
            >
              {strings('rewards.kol.invite_title')}
            </BottomSheetHeader>
            <Box twClassName="px-4">
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                {strings('rewards.kol.invite_body')}
              </Text>
              <ReferralInviteCodeField
                referralCode={referralCode}
                onChangeReferralCode={setReferralCode}
                twClassName="mt-4 mb-6"
              />
            </Box>
            <Box twClassName="gap-3 px-4">
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                isFullWidth
                isDisabled={referralCode.length < KOL_INVITE_FIXTURE.codeLength}
                onPress={handleAccept}
                testID={KOL_DASHBOARD_SELECTORS.INVITE_ACCEPT}
              >
                {strings('rewards.kol.invite_accept')}
              </Button>
              <Button
                variant={ButtonVariant.Tertiary}
                size={ButtonSize.Lg}
                isFullWidth
                onPress={handleDecline}
                testID={KOL_DASHBOARD_SELECTORS.INVITE_DECLINE}
              >
                {strings('rewards.kol.invite_decline')}
              </Button>
            </Box>
          </BottomSheet>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </Modal>
  );
};

export default ReferralInviteSheet;
