import React from 'react';
import {
  Box,
  BottomSheetHeader,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
import KolDashboardSheet from './KolDashboardSheet';

interface RewardsLocationSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirmAllOutsideUs: () => void;
  onConfirmSomeUsActivity: () => void;
}

const RewardsLocationSheet: React.FC<RewardsLocationSheetProps> = ({
  isVisible,
  onClose,
  onConfirmAllOutsideUs,
  onConfirmSomeUsActivity,
}) => (
  <KolDashboardSheet
    isVisible={isVisible}
    onClose={onClose}
    testID={KOL_DASHBOARD_SELECTORS.REWARDS_LOCATION_SHEET}
  >
    <BottomSheetHeader
      onClose={onClose}
      testID={KOL_DASHBOARD_SELECTORS.REWARDS_LOCATION_TITLE}
    >
      {strings('rewards.kol.rewards_location_title')}
    </BottomSheetHeader>
    <Box twClassName="px-4">
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        testID={KOL_DASHBOARD_SELECTORS.REWARDS_LOCATION_DESCRIPTION}
      >
        {strings('rewards.kol.rewards_location_description')}
      </Text>
    </Box>
    <Box twClassName="gap-3 px-4 pb-6 pt-6">
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        onPress={onConfirmAllOutsideUs}
        twClassName="w-full"
        testID={KOL_DASHBOARD_SELECTORS.REWARDS_LOCATION_YES}
      >
        {strings('rewards.kol.rewards_location_all_outside')}
      </Button>
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        onPress={onConfirmSomeUsActivity}
        twClassName="w-full"
        testID={KOL_DASHBOARD_SELECTORS.REWARDS_LOCATION_NO}
      >
        {strings('rewards.kol.rewards_location_some_us')}
      </Button>
    </Box>
  </KolDashboardSheet>
);

export default RewardsLocationSheet;
