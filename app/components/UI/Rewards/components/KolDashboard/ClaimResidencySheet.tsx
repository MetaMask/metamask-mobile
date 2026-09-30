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

interface ClaimResidencySheetProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirmUs: () => void;
  onConfirmNonUs: () => void;
}

const ClaimResidencySheet: React.FC<ClaimResidencySheetProps> = ({
  isVisible,
  onClose,
  onConfirmUs,
  onConfirmNonUs,
}) => (
  <KolDashboardSheet
    isVisible={isVisible}
    onClose={onClose}
    testID={KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_SHEET}
  >
    <BottomSheetHeader
      onClose={onClose}
      testID={KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_TITLE}
    >
      {strings('rewards.kol.claim_residency_title')}
    </BottomSheetHeader>
    <Box twClassName="px-4">
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        testID={KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_DESCRIPTION}
      >
        {strings('rewards.kol.claim_residency_description')}
      </Text>
    </Box>
    <Box twClassName="gap-3 px-4 pt-6">
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={onConfirmUs}
        testID={KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_YES}
      >
        {strings('rewards.kol.claim_residency_yes')}
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={onConfirmNonUs}
        testID={KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_NO}
      >
        {strings('rewards.kol.claim_residency_no')}
      </Button>
    </Box>
  </KolDashboardSheet>
);

export default ClaimResidencySheet;
