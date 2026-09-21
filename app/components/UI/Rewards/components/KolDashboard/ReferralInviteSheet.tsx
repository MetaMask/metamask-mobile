import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Image,
  type LayoutChangeEvent,
  Modal,
  StyleSheet,
  type TextInput,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetRef,
  ButtonSize,
  ButtonsAlignment,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Label,
  Text,
  TextButton,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import referralShareHero from '../../../../../images/rewards/referral-share-hero.png';
import { KOL_INVITE_FIXTURE } from './rewardsUiFixtures';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

interface ReferralInviteCodeFieldProps {
  referralCode: string;
  onChangeReferralCode: (value: string) => void;
}

const ReferralInviteCodeField: React.FC<ReferralInviteCodeFieldProps> = ({
  referralCode,
  onChangeReferralCode,
}) => {
  const inputRef = useRef<TextInput>(null);
  const codeAtEditStartRef = useRef(referralCode);
  const [isEditing, setIsEditing] = useState(false);
  const [hasEdited, setHasEdited] = useState(false);
  const [displayHeight, setDisplayHeight] = useState<number>();
  const isCompleteCode =
    isEditing &&
    hasEdited &&
    referralCode.length === KOL_INVITE_FIXTURE.codeLength;

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const handleBeginEditing = useCallback(() => {
    codeAtEditStartRef.current = referralCode;
    setHasEdited(false);
    setIsEditing(true);
  }, [referralCode]);

  const handleChangeCode = useCallback(
    (value: string) => {
      setHasEdited(true);
      onChangeReferralCode(
        value.toUpperCase().slice(0, KOL_INVITE_FIXTURE.codeLength),
      );
    },
    [onChangeReferralCode],
  );

  const handleCancelEditing = useCallback(() => {
    onChangeReferralCode(codeAtEditStartRef.current);
    setHasEdited(false);
    setIsEditing(false);
  }, [onChangeReferralCode]);

  const handleBlur = useCallback(() => {
    if (referralCode.length > 0) {
      return;
    }
    handleCancelEditing();
  }, [handleCancelEditing, referralCode.length]);

  // The display and editing states have different intrinsic heights, so the
  // measured display height is held as a floor to stop the sheet from jumping
  // when the field swaps over.
  const handleDisplayLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (isEditing) {
        return;
      }
      const nextHeight = Math.round(event.nativeEvent.layout.height);
      setDisplayHeight((current) =>
        current === nextHeight ? current : nextHeight,
      );
    },
    [isEditing],
  );

  const reservedHeightStyle = useMemo(
    () =>
      isEditing && displayHeight ? { minHeight: displayHeight } : undefined,
    [displayHeight, isEditing],
  );

  return (
    <Box
      twClassName="mt-4 justify-start"
      onLayout={handleDisplayLayout}
      style={reservedHeightStyle}
      testID={KOL_DASHBOARD_SELECTORS.INVITE_CODE_FIELD}
    >
      {isEditing ? (
        <>
          <Label fontWeight={FontWeight.Medium}>
            {strings('rewards.kol.invite_referral_code')}
          </Label>
          <TextField
            value={referralCode}
            onChangeText={handleChangeCode}
            onBlur={handleBlur}
            inputRef={inputRef}
            placeholder={strings('rewards.kol.invite_code_placeholder')}
            endAccessory={
              isCompleteCode ? (
                <Icon
                  name={IconName.Check}
                  size={IconSize.Md}
                  color={IconColor.SuccessDefault}
                  testID={KOL_DASHBOARD_SELECTORS.INVITE_CODE_COMPLETE}
                />
              ) : (
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextAlternative}
                  onPress={handleCancelEditing}
                  accessibilityRole="button"
                  testID={KOL_DASHBOARD_SELECTORS.INVITE_CANCEL_EDIT}
                >
                  {strings('rewards.kol.invite_cancel_edit')}
                </Text>
              )
            }
            inputProps={{
              autoCapitalize: 'characters',
              autoCorrect: false,
              autoComplete: 'off',
              maxLength: KOL_INVITE_FIXTURE.codeLength,
              accessibilityLabel: strings('rewards.kol.invite_referral_code'),
            }}
            testID={KOL_DASHBOARD_SELECTORS.INVITE_CODE_INPUT}
          />
        </>
      ) : (
        <>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('rewards.kol.invite_referral_code')}
          </Text>
          <Text
            variant={TextVariant.DisplayMd}
            fontWeight={FontWeight.Bold}
            twClassName="leading-none"
            testID={KOL_DASHBOARD_SELECTORS.INVITE_CODE}
          >
            {referralCode}
          </Text>
          <TextButton
            variant={TextVariant.BodySm}
            onPress={handleBeginEditing}
            accessibilityRole="button"
            twClassName="self-start p-0"
            testID={KOL_DASHBOARD_SELECTORS.INVITE_EDIT_CODE}
          >
            {strings('rewards.kol.invite_use_different_code')}
          </TextButton>
        </>
      )}
    </Box>
  );
};

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
  const tw = useTailwind();
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
              <Box alignItems={BoxAlignItems.Center}>
                <Image
                  source={referralShareHero}
                  resizeMode="contain"
                  style={tw.style('h-28 w-48')}
                  accessibilityLabel={strings(
                    'rewards.kol.invite_illustration_label',
                  )}
                />
              </Box>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                twClassName="mt-4"
              >
                {strings('rewards.kol.invite_body')}
              </Text>
              <ReferralInviteCodeField
                referralCode={referralCode}
                onChangeReferralCode={setReferralCode}
              />
            </Box>
            <BottomSheetFooter
              buttonsAlignment={ButtonsAlignment.Vertical}
              secondaryButtonProps={{
                children: strings('rewards.kol.invite_decline'),
                onPress: handleDecline,
                size: ButtonSize.Lg,
                testID: KOL_DASHBOARD_SELECTORS.INVITE_DECLINE,
              }}
              primaryButtonProps={{
                children: strings('rewards.kol.invite_accept'),
                onPress: handleAccept,
                size: ButtonSize.Lg,
                testID: KOL_DASHBOARD_SELECTORS.INVITE_ACCEPT,
              }}
              twClassName="px-4 pt-6"
            />
          </BottomSheet>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </Modal>
  );
};

export default ReferralInviteSheet;
