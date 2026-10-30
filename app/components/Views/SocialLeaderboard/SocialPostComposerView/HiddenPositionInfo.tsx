import React, { useCallback, useRef } from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  ButtonSize,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { HiddenPositionInfoSelectorsIDs } from './HiddenPositionInfo.testIds';

export interface HiddenPositionInfoProps {
  /** Called after the sheet finishes its close transition. */
  onDismiss: () => void;
}

const HiddenPositionInfo: React.FC<HiddenPositionInfoProps> = ({
  onDismiss,
}) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  const requestDismiss = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={onDismiss}
      testID={HiddenPositionInfoSelectorsIDs.SHEET}
    >
      <BottomSheetHeader
        onBack={requestDismiss}
        backButtonProps={{
          accessibilityLabel: strings('navigation.back'),
          testID: HiddenPositionInfoSelectorsIDs.BACK,
        }}
      >
        {strings('social_leaderboard.composer.empty_help')}
      </BottomSheetHeader>
      <Box twClassName="px-4 pt-2 pb-4">
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          testID={HiddenPositionInfoSelectorsIDs.BODY}
        >
          {strings('social_leaderboard.composer.hidden_position_body')}
        </Text>
      </Box>
      <BottomSheetFooter
        primaryButtonProps={{
          size: ButtonSize.Lg,
          children: strings('social_leaderboard.composer.got_it'),
          onPress: requestDismiss,
          testID: HiddenPositionInfoSelectorsIDs.CONFIRM,
        }}
      />
    </BottomSheet>
  );
};

export default HiddenPositionInfo;
