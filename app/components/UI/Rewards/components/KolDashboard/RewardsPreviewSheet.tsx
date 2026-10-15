import React, { useCallback } from 'react';
import {
  BottomSheetHeader,
  ListItem,
  ListItemSelect,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
import KolDashboardSheet from './KolDashboardSheet';

export type RewardsPreviewAction =
  | 'mainDashboard'
  | 'invitedExistingUser'
  | 'claimsOnHold'
  | 'claimsPaused'
  | 'resetClaim';

interface RewardsPreviewSheetProps {
  isVisible: boolean;
  onClose: () => void;
  /** True while the enrolled KOL dashboard is showing. */
  isMainDashboardSelected: boolean;
  onSelect: (action: RewardsPreviewAction) => void;
}

const ACTION_ROWS: {
  action: Exclude<RewardsPreviewAction, 'mainDashboard'>;
  labelKey:
    | 'preview_invited_existing_user'
    | 'preview_claims_on_hold'
    | 'preview_claims_paused'
    | 'preview_reset_claim';
  testID: string;
}[] = [
  {
    action: 'invitedExistingUser',
    labelKey: 'preview_invited_existing_user',
    testID: KOL_DASHBOARD_SELECTORS.PREVIEW_INVITED_EXISTING_USER,
  },
  {
    action: 'claimsOnHold',
    labelKey: 'preview_claims_on_hold',
    testID: KOL_DASHBOARD_SELECTORS.PREVIEW_CLAIMS_ON_HOLD,
  },
  {
    action: 'claimsPaused',
    labelKey: 'preview_claims_paused',
    testID: KOL_DASHBOARD_SELECTORS.PREVIEW_CLAIMS_PAUSED,
  },
  {
    action: 'resetClaim',
    labelKey: 'preview_reset_claim',
    testID: KOL_DASHBOARD_SELECTORS.PREVIEW_RESET_CLAIM,
  },
];

/**
 * Prototype-only launcher for KOL Rewards fixture states. Engineers delete
 * this sheet when referral and claim state come from controllers.
 */
const RewardsPreviewSheet: React.FC<RewardsPreviewSheetProps> = ({
  isVisible,
  onClose,
  isMainDashboardSelected,
  onSelect,
}) => {
  const handleSelect = useCallback(
    (action: RewardsPreviewAction) => {
      onSelect(action);
    },
    [onSelect],
  );

  return (
    <KolDashboardSheet
      isVisible={isVisible}
      onClose={onClose}
      testID={KOL_DASHBOARD_SELECTORS.PREVIEW_SHEET}
    >
      <BottomSheetHeader
        onClose={onClose}
        testID={KOL_DASHBOARD_SELECTORS.PREVIEW_TITLE}
      >
        {strings('rewards.kol.preview_state_title')}
      </BottomSheetHeader>
      <ListItemSelect
        title={strings('rewards.kol.preview_main_dashboard')}
        isSelected={isMainDashboardSelected}
        showSelectedIcon
        onPress={() => handleSelect('mainDashboard')}
        testID={KOL_DASHBOARD_SELECTORS.PREVIEW_MAIN_DASHBOARD}
        accessibilityRole="radio"
        accessibilityState={{ selected: isMainDashboardSelected }}
      />
      {ACTION_ROWS.map((row) => (
        <ListItem
          key={row.action}
          isInteractive
          title={strings(`rewards.kol.${row.labelKey}`)}
          onPress={() => handleSelect(row.action)}
          testID={row.testID}
          accessibilityRole="button"
        />
      ))}
    </KolDashboardSheet>
  );
};

export default RewardsPreviewSheet;
