import React from 'react';
import {
  Box,
  BottomSheetHeader,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
import KolDashboardSheet from './KolDashboardSheet';

export type ClaimPrototypeOption =
  | 'usFirstTime'
  | 'usPending'
  | 'usApproved'
  | 'elsewhere';

interface ClaimPrototypeSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onSelect: (option: ClaimPrototypeOption) => void;
}

const OPTIONS: {
  option: ClaimPrototypeOption;
  labelKey:
    | 'claim_prototype_us_first_time'
    | 'claim_prototype_us_pending'
    | 'claim_prototype_us_approved'
    | 'claim_prototype_elsewhere';
  testID: string;
}[] = [
  {
    option: 'usFirstTime',
    labelKey: 'claim_prototype_us_first_time',
    testID: KOL_DASHBOARD_SELECTORS.CLAIM_PROTOTYPE_US_FIRST_TIME,
  },
  {
    option: 'usPending',
    labelKey: 'claim_prototype_us_pending',
    testID: KOL_DASHBOARD_SELECTORS.CLAIM_PROTOTYPE_US_PENDING,
  },
  {
    option: 'usApproved',
    labelKey: 'claim_prototype_us_approved',
    testID: KOL_DASHBOARD_SELECTORS.CLAIM_PROTOTYPE_US_APPROVED,
  },
  {
    option: 'elsewhere',
    labelKey: 'claim_prototype_elsewhere',
    testID: KOL_DASHBOARD_SELECTORS.CLAIM_PROTOTYPE_ELSEWHERE,
  },
];

const ClaimPrototypeSheet: React.FC<ClaimPrototypeSheetProps> = ({
  isVisible,
  onClose,
  onSelect,
}) => (
  <KolDashboardSheet
    isVisible={isVisible}
    onClose={onClose}
    testID={KOL_DASHBOARD_SELECTORS.CLAIM_PROTOTYPE_SHEET}
  >
    <BottomSheetHeader
      onClose={onClose}
      testID={KOL_DASHBOARD_SELECTORS.CLAIM_PROTOTYPE_TITLE}
    >
      {strings('rewards.kol.claim_prototype_title')}
    </BottomSheetHeader>
    <Box twClassName="gap-3 px-4 pb-6">
      {OPTIONS.map(({ option, labelKey, testID }) => (
        <Button
          key={option}
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          onPress={() => onSelect(option)}
          twClassName="w-full"
          testID={testID}
        >
          {strings(`rewards.kol.${labelKey}`)}
        </Button>
      ))}
    </Box>
  </KolDashboardSheet>
);

export default ClaimPrototypeSheet;
