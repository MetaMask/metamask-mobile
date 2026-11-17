import React, { useCallback, useRef, useState } from 'react';
import {
  BottomSheet,
  Box,
  Button,
  ButtonSemantic,
  ButtonSemanticSeverity,
  ButtonSize,
  ButtonVariant,
  IconName,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import SocialImpersonationSupport from '../../../../UI/SocialFeed/components/SocialImpersonationSupport';
import SocialReportReasonPicker from '../../../../UI/SocialFeed/components/SocialReportReasonPicker';
import { SocialEntryOptionsBottomSheetSelectorsIDs } from '../../../../UI/SocialFeed/components/SocialEntryOptionsBottomSheet.testIds';
import { SocialEntryReportReason } from '../../../../UI/SocialFeed/reportReasons';
import { ProfileOptionsSheetSelectorsIDs } from './ProfileOptionsSheet.testIds';
import BottomSheetHeaderGlass from '../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { useSelector } from 'react-redux';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';

export interface ProfileOptionsSheetProps {
  /** Trader display name, shown as `@name` on the Block and Report buttons. */
  traderName: string;
  onBlock: () => void;
  /** Reports the profile. Impersonation never reaches this: support is shown instead. */
  onReport: (reason: SocialEntryReportReason) => void;
  onClose: () => void;
}

type ProfileOptionsStep = 'actions' | 'reasons' | 'support';

/** Actions for another trader's profile, opened from the header "..." button. */
const ProfileOptionsSheet: React.FC<ProfileOptionsSheetProps> = ({
  traderName,
  onBlock,
  onReport,
  onClose,
}) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const sheetRef = useRef<BottomSheetRef>(null);
  const [step, setStep] = useState<ProfileOptionsStep>('actions');
  const [selectedReason, setSelectedReason] =
    useState<SocialEntryReportReason | null>(null);

  const dismiss = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleBlockPress = useCallback(() => {
    onBlock();
    dismiss();
  }, [onBlock, dismiss]);

  const handleSubmitReport = useCallback(() => {
    if (!selectedReason) {
      return;
    }
    if (selectedReason === SocialEntryReportReason.Impersonation) {
      setStep('support');
      return;
    }
    onReport(selectedReason);
    dismiss();
  }, [dismiss, onReport, selectedReason]);

  const titleKey =
    step === 'support'
      ? 'social_leaderboard.entry_options.impersonation_support_title'
      : step === 'reasons'
        ? 'social_leaderboard.entry_options.report_reason_title'
        : 'social_leaderboard.trader_profile.profile_options';

  return (
    <BottomSheet
      ref={sheetRef}
      isInteractable
      onClose={onClose}
      testID={
        step === 'support'
          ? SocialEntryOptionsBottomSheetSelectorsIDs.IMPERSONATION_SUPPORT
          : step === 'reasons'
            ? SocialEntryOptionsBottomSheetSelectorsIDs.REPORT_REASON_SHEET
            : ProfileOptionsSheetSelectorsIDs.SHEET
      }
    >
      <BottomSheetHeaderGlass
        isGlass={isGlassHeader}
        onClose={dismiss}
        closeButtonProps={{
          testID: ProfileOptionsSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings(titleKey)}
      </BottomSheetHeaderGlass>
      {step === 'support' ? (
        <SocialImpersonationSupport onDismiss={dismiss} />
      ) : step === 'reasons' ? (
        <SocialReportReasonPicker
          selectedReason={selectedReason}
          onSelectReason={setSelectedReason}
          onSubmit={handleSubmitReport}
        />
      ) : (
        <Box twClassName="px-4 pb-4" gap={4}>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={ProfileOptionsSheetSelectorsIDs.DESCRIPTION}
          >
            {strings(
              'social_leaderboard.trader_profile.profile_options_description',
            )}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            startIconName={IconName.Flag}
            onPress={() => setStep('reasons')}
            testID={ProfileOptionsSheetSelectorsIDs.REPORT_BUTTON}
          >
            {strings('social_leaderboard.trader_profile.report_user', {
              name: traderName,
            })}
          </Button>
          <ButtonSemantic
            severity={ButtonSemanticSeverity.Danger}
            startIconName={IconName.Ban}
            isFullWidth
            onPress={handleBlockPress}
            testID={ProfileOptionsSheetSelectorsIDs.BLOCK_BUTTON}
          >
            {strings('social_leaderboard.trader_profile.block_user', {
              name: traderName,
            })}
          </ButtonSemantic>
        </Box>
      )}
    </BottomSheet>
  );
};

export default ProfileOptionsSheet;
