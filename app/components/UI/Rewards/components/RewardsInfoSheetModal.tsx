import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  ButtonSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';

export const REWARDS_INFO_SHEET_MODAL_TEST_IDS = {
  CONTAINER: 'rewards-info-sheet-modal',
  TITLE: 'rewards-info-sheet-modal-title',
  DESCRIPTION: 'rewards-info-sheet-modal-description',
  CLOSE: 'rewards-info-sheet-modal-close',
  GOT_IT: 'rewards-info-sheet-modal-got-it',
} as const;

export interface RewardsInfoSheetModalParams {
  title: string;
  description: string;
}

interface RewardsInfoSheetModalProps {
  route: {
    params: RewardsInfoSheetModalParams;
  };
}

/**
 * Title, description, and a primary "Got it" action.
 * Layout matches the Kol dashboard info sheets: a header with close,
 * alternative body copy, and a large primary footer button.
 */
const RewardsInfoSheetModal: React.FC<RewardsInfoSheetModalProps> = ({
  route,
}) => {
  const { title, description } = route.params;
  const navigation = useNavigation<AppNavigationProp>();

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <BottomSheet
      onClose={handleClose}
      testID={REWARDS_INFO_SHEET_MODAL_TEST_IDS.CONTAINER}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: REWARDS_INFO_SHEET_MODAL_TEST_IDS.CLOSE,
        }}
        testID={REWARDS_INFO_SHEET_MODAL_TEST_IDS.TITLE}
      >
        {title}
      </BottomSheetHeader>
      <Box twClassName="px-4">
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={REWARDS_INFO_SHEET_MODAL_TEST_IDS.DESCRIPTION}
        >
          {description}
        </Text>
      </Box>
      <BottomSheetFooter
        primaryButtonProps={{
          children: strings('rewards.upcoming_rewards.cta_label'),
          onPress: handleClose,
          size: ButtonSize.Lg,
          testID: REWARDS_INFO_SHEET_MODAL_TEST_IDS.GOT_IT,
        }}
        twClassName="px-4 pt-6"
      />
    </BottomSheet>
  );
};

export default RewardsInfoSheetModal;
