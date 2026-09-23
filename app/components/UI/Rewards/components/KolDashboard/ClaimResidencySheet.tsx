import React from 'react';
import {
  Box,
  BottomSheetFooter,
  BottomSheetHeader,
  ButtonSize,
  ButtonsAlignment,
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
    <BottomSheetFooter
      buttonsAlignment={ButtonsAlignment.Vertical}
      secondaryButtonProps={{
        children: strings('rewards.kol.claim_residency_no'),
        onPress: onConfirmNonUs,
        size: ButtonSize.Lg,
        testID: KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_NO,
      }}
      primaryButtonProps={{
        children: strings('rewards.kol.claim_residency_yes'),
        onPress: onConfirmUs,
        size: ButtonSize.Lg,
        testID: KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_YES,
      }}
      twClassName="px-4 pt-6"
    />
  </KolDashboardSheet>
);

export default ClaimResidencySheet;
