import React, { useCallback, useRef } from 'react';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  ButtonSemantic,
  ButtonSemanticSeverity,
  IconName,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { ProfileOptionsSheetSelectorsIDs } from './ProfileOptionsSheet.testIds';

export interface ProfileOptionsSheetProps {
  /** Trader display name, shown as `@name` on the Block button. */
  traderName: string;
  onBlock: () => void;
  onClose: () => void;
}

/** Actions for another trader's profile, opened from the header "..." button. */
const ProfileOptionsSheet: React.FC<ProfileOptionsSheetProps> = ({
  traderName,
  onBlock,
  onClose,
}) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  const dismiss = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleBlockPress = useCallback(() => {
    onBlock();
    dismiss();
  }, [onBlock, dismiss]);

  return (
    <BottomSheet
      ref={sheetRef}
      isInteractable
      onClose={onClose}
      testID={ProfileOptionsSheetSelectorsIDs.SHEET}
    >
      <BottomSheetHeader
        onClose={dismiss}
        closeButtonProps={{
          testID: ProfileOptionsSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('social_leaderboard.trader_profile.profile_options')}
      </BottomSheetHeader>
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
    </BottomSheet>
  );
};

export default ProfileOptionsSheet;
