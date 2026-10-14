import React from 'react';
import {
  Box,
  BottomSheetFooter,
  BottomSheetHeader,
  ButtonSize,
  FontWeight,
  KeyValueRow,
  KeyValueRowVariant,
  SectionDivider,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
import KolDashboardSheet from './KolDashboardSheet';
import { formatUsd, getClaimEarningsBreakdownRows } from './rewardsUiFixtures';

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
    <Box
      twClassName="px-4"
      testID={KOL_DASHBOARD_SELECTORS.CLAIMS_PAUSED_DESCRIPTION}
    >
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {strings('rewards.kol.claims_paused_description')}
      </Text>
    </Box>
    <SectionDivider
      marginVertical={4}
      testID={KOL_DASHBOARD_SELECTORS.CLAIMS_PAUSED_DIVIDER}
    />
    <Box twClassName="px-4 mb-2">
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
        testID={KOL_DASHBOARD_SELECTORS.CLAIMS_PAUSED_BREAKDOWN_HEADER}
      >
        {strings('rewards.kol.claims_breakdown_title')}
      </Text>
    </Box>
    {getClaimEarningsBreakdownRows().map((row) => (
      <KeyValueRow
        key={row.id}
        variant={KeyValueRowVariant.Summary}
        keyLabel={strings(`rewards.kol.${row.labelKey}`)}
        value={formatUsd(row.amount)}
        testID={`${KOL_DASHBOARD_SELECTORS.CLAIMS_PAUSED_BREAKDOWN}-${row.id}`}
      />
    ))}
    <BottomSheetFooter
      primaryButtonProps={{
        children: strings('rewards.kol.claims_paused_got_it'),
        onPress: onClose,
        size: ButtonSize.Lg,
        testID: KOL_DASHBOARD_SELECTORS.CLAIMS_PAUSED_GOT_IT,
      }}
      twClassName="px-4 pt-4"
    />
  </KolDashboardSheet>
);

export default ClaimsPausedSheet;
