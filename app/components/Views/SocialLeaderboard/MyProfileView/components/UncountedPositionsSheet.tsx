import React, { useCallback, useRef } from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  Box,
  ButtonSize,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MyProfileViewSelectorsIDs } from '../MyProfileView.testIds';
import BottomSheetHeaderGlass from '../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { useSelector } from 'react-redux';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';

export interface UncountedPositionsSheetProps {
  onClose: () => void;
  /** Owner copy says "You…". Other viewers keep "This trader…". */
  isOwner?: boolean;
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
 * Explains why some positions sit outside P&L.
 *
 * The unsupported-token item is explanation copy only. This sheet does not
 * read position flags. Which rows are counted comes from server flags via
 * `partitionUncountedPositions`. The unsupported-token label mapping arrives
 * separately.
 */
const UncountedPositionsSheet: React.FC<UncountedPositionsSheetProps> = ({
  onClose,
  isOwner = false,
}) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const insiderBodyKey = isOwner
    ? 'social_leaderboard.my_profile.not_counted_sheet_insider_body_owner'
    : 'social_leaderboard.my_profile.not_counted_sheet_insider_body';
  const developerBodyKey = isOwner
    ? 'social_leaderboard.my_profile.not_counted_sheet_developer_body_owner'
    : 'social_leaderboard.my_profile.not_counted_sheet_developer_body';
  const sheetRef = useRef<BottomSheetRef>(null);

  const handleDismiss = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={onClose}
      testID={MyProfileViewSelectorsIDs.UNCOUNTED_SHEET}
    >
      <BottomSheetHeaderGlass
        isGlass={isGlassHeader}
        onClose={handleDismiss}
        closeButtonProps={{
          testID: MyProfileViewSelectorsIDs.UNCOUNTED_SHEET_CLOSE,
        }}
      >
        {strings('social_leaderboard.my_profile.not_counted_sheet_title')}
      </BottomSheetHeaderGlass>
      <Box twClassName="px-4 gap-4 pb-6">
        <Explanation
          label={strings(
            'social_leaderboard.my_profile.not_counted_sheet_insider_label',
          )}
          body={strings(insiderBodyKey)}
        />
        <Explanation
          label={strings(
            'social_leaderboard.my_profile.not_counted_sheet_developer_label',
          )}
          body={strings(developerBodyKey)}
        />
        <Explanation
          label={strings(
            'social_leaderboard.my_profile.not_counted_sheet_unsupported_label',
          )}
          body={strings(
            'social_leaderboard.my_profile.not_counted_sheet_unsupported_body',
          )}
        />
      </Box>
      <BottomSheetFooter
        primaryButtonProps={{
          size: ButtonSize.Lg,
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
