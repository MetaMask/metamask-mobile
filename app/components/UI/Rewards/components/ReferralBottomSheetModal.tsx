import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Text,
  TextVariant,
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  BoxFlexDirection,
  ButtonIcon,
  IconName,
  IconColor,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../locales/i18n';
import MetamaskRewardsPointsImage from '../../../../images/rewards/metamask-rewards-points.svg';
import ReferralDetails from './ReferralDetails/ReferralDetails';

const ReferralBottomSheetModal = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();

  const handleDismiss = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <BottomSheet ref={sheetRef}>
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="p-4"
      >
        {/* Close Button */}
        <Box twClassName="w-full flex-row justify-end">
          <ButtonIcon
            onPress={handleDismiss}
            iconName={IconName.Close}
            iconProps={{
              color: IconColor.IconDefault,
            }}
          />
        </Box>

        {/* Title */}
        <Box twClassName="w-full items-start mb-2">
          <Text variant={TextVariant.HeadingLg}>
            {strings('rewards.ways_to_earn.referrals.sheet.title')}
          </Text>
          <Box
            flexDirection={BoxFlexDirection.Row}
            twClassName="bg-muted px-2 mt-2 py-1 rounded-md gap-1"
            alignItems={BoxAlignItems.Center}
          >
            <MetamaskRewardsPointsImage
              width={16}
              height={16}
              name="MetamaskRewardsPoints"
            />
            <Text variant={TextVariant.BodySm}>
              {strings('rewards.ways_to_earn.referrals.sheet.points')}
            </Text>
          </Box>
        </Box>

        {/* Description */}
        <Box twClassName="w-full mt-4 mb-6">
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {strings('rewards.referral.info.description')}
          </Text>
        </Box>

        <Box twClassName="w-full">
          <ReferralDetails showInfoSection={false} />
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default ReferralBottomSheetModal;
