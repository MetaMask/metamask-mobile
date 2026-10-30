import React, { useEffect, useRef } from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MyProfileViewSelectorsIDs } from '../MyProfileView.testIds';

export interface UncountedPositionsSheetProps {
  onClose: () => void;
}

interface ExplanationProps {
  label: string;
  body: string;
}

const Explanation: React.FC<ExplanationProps> = ({ label, body }) => (
  <Box twClassName="gap-1">
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextDefault}
    >
      {label}
    </Text>
    <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
      {body}
    </Text>
  </Box>
);

/**
 * Explains why flagged positions sit outside P&L.
 *
 * One sheet covers every flag. The header that opens it is the only control.
 */
const UncountedPositionsSheet: React.FC<UncountedPositionsSheetProps> = ({
  onClose,
}) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  useEffect(() => {
    sheetRef.current?.onOpenBottomSheet();
  }, []);

  const handleDismiss = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  return (
    <BottomSheet
      ref={sheetRef}
      isInteractable
      onClose={onClose}
      testID={MyProfileViewSelectorsIDs.UNCOUNTED_SHEET}
    >
      <BottomSheetHeader
        onClose={handleDismiss}
        closeButtonProps={{
          testID: MyProfileViewSelectorsIDs.UNCOUNTED_SHEET_CLOSE,
        }}
      >
        {strings('social_leaderboard.my_profile.not_counted_sheet_title')}
      </BottomSheetHeader>
      <Box twClassName="px-4 gap-4 pb-6">
        <Explanation
          label={strings(
            'social_leaderboard.my_profile.not_counted_sheet_insider_label',
          )}
          body={strings(
            'social_leaderboard.my_profile.not_counted_sheet_insider_body',
          )}
        />
        <Explanation
          label={strings(
            'social_leaderboard.my_profile.not_counted_sheet_developer_label',
          )}
          body={strings(
            'social_leaderboard.my_profile.not_counted_sheet_developer_body',
          )}
        />
      </Box>
      <BottomSheetFooter
        primaryButtonProps={{
          children: strings(
            'social_leaderboard.my_profile.not_counted_sheet_dismiss',
          ),
          onPress: handleDismiss,
          testID: MyProfileViewSelectorsIDs.UNCOUNTED_SHEET_DISMISS,
        }}
      />
    </BottomSheet>
  );
};

export default UncountedPositionsSheet;
