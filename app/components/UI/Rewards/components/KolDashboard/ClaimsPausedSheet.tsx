import React from 'react';
import {
  Box,
  BottomSheetFooter,
  BottomSheetHeader,
  ButtonSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
import KolDashboardSheet from './KolDashboardSheet';

interface ClaimsPausedSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

const ClaimsPausedSheet: React.FC<ClaimsPausedSheetProps> = ({
  isVisible,
  onClose,
}) => (
  <KolDashboardSheet
    isVisible={isVisible}
    onClose={onClose}
    testID={KOL_DASHBOARD_SELECTORS.CLAIMS_PAUSED_SHEET}
  >
    <BottomSheetHeader
      onClose={onClose}
      testID={KOL_DASHBOARD_SELECTORS.CLAIMS_PAUSED_TITLE}
    >
      {strings('rewards.kol.claims_paused_title')}
    </BottomSheetHeader>
    <Box twClassName="px-4">
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        testID={KOL_DASHBOARD_SELECTORS.CLAIMS_PAUSED_DESCRIPTION}
      >
        {strings('rewards.kol.claims_paused_description')}
      </Text>
    </Box>
    <BottomSheetFooter
      primaryButtonProps={{
        children: strings('rewards.kol.claims_paused_got_it'),
        onPress: onClose,
        size: ButtonSize.Lg,
        testID: KOL_DASHBOARD_SELECTORS.CLAIMS_PAUSED_GOT_IT,
      }}
      twClassName="px-4 pt-6"
    />
  </KolDashboardSheet>
);

export default ClaimsPausedSheet;
