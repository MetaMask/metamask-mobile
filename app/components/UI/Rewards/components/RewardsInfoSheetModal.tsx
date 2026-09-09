import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import {
  BottomSheet,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  IconColor,
  IconName,
  Text,
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
 * Simple info bottom sheet for Rewards (title + description + "Got it").
 * Layout mirrors CampaignOptInSheet: centered header title, close affordance,
 * body copy, and a full-width dismiss CTA.
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
      <Box twClassName="px-4 pb-4">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="mb-6"
        >
          <Box twClassName="w-10" />
          <Box
            twClassName="flex-1 items-center"
            justifyContent={BoxJustifyContent.Center}
          >
            <Text
              variant={TextVariant.HeadingSm}
              fontWeight={FontWeight.Bold}
              testID={REWARDS_INFO_SHEET_MODAL_TEST_IDS.TITLE}
            >
              {title}
            </Text>
          </Box>
          <ButtonIcon
            iconName={IconName.Close}
            iconProps={{ color: IconColor.IconDefault }}
            onPress={handleClose}
            testID={REWARDS_INFO_SHEET_MODAL_TEST_IDS.CLOSE}
          />
        </Box>

        <Box twClassName="mb-6">
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-alternative"
            testID={REWARDS_INFO_SHEET_MODAL_TEST_IDS.DESCRIPTION}
          >
            {description}
          </Text>
        </Box>

        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          onPress={handleClose}
          twClassName="w-full"
          testID={REWARDS_INFO_SHEET_MODAL_TEST_IDS.GOT_IT}
        >
          {strings('rewards.upcoming_rewards.cta_label')}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default RewardsInfoSheetModal;
