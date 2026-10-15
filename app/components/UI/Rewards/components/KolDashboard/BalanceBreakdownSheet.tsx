import React from 'react';
import {
  BottomSheetFooter,
  BottomSheetHeader,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
import ClaimEarningsBreakdown from './ClaimEarningsBreakdown';
import KolDashboardSheet from './KolDashboardSheet';

interface BalanceBreakdownSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

const BalanceBreakdownSheet: React.FC<BalanceBreakdownSheetProps> = ({
  isVisible,
  onClose,
}) => (
  <KolDashboardSheet
    isVisible={isVisible}
    onClose={onClose}
    testID={KOL_DASHBOARD_SELECTORS.BALANCE_BREAKDOWN_SHEET}
  >
    <BottomSheetHeader
      onClose={onClose}
      testID={KOL_DASHBOARD_SELECTORS.BALANCE_BREAKDOWN_TITLE}
    >
      {strings('rewards.kol.claims_breakdown_title')}
    </BottomSheetHeader>
    <ClaimEarningsBreakdown
      testIDPrefix={KOL_DASHBOARD_SELECTORS.BALANCE_BREAKDOWN_ROW}
    />
    <BottomSheetFooter
      primaryButtonProps={{
        children: strings('rewards.kol.claims_paused_got_it'),
        onPress: onClose,
        size: ButtonSize.Lg,
        testID: KOL_DASHBOARD_SELECTORS.BALANCE_BREAKDOWN_GOT_IT,
      }}
      twClassName="px-4 pt-4"
    />
  </KolDashboardSheet>
);

export default BalanceBreakdownSheet;
