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

interface HistoryOnHoldSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

const HistoryOnHoldSheet: React.FC<HistoryOnHoldSheetProps> = ({
  isVisible,
  onClose,
}) => (
  <KolDashboardSheet
    isVisible={isVisible}
    onClose={onClose}
    testID={KOL_DASHBOARD_SELECTORS.HISTORY_ON_HOLD_SHEET}
  >
    <BottomSheetHeader
      onClose={onClose}
      testID={KOL_DASHBOARD_SELECTORS.HISTORY_ON_HOLD_TITLE}
    >
      {strings('rewards.kol.history_on_hold_title')}
    </BottomSheetHeader>
    <Box twClassName="px-4">
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        testID={KOL_DASHBOARD_SELECTORS.HISTORY_ON_HOLD_DESCRIPTION}
      >
        {strings('rewards.kol.history_on_hold_description')}
      </Text>
    </Box>
    <BottomSheetFooter
      primaryButtonProps={{
        children: strings('rewards.kol.history_on_hold_got_it'),
        onPress: onClose,
        size: ButtonSize.Lg,
        testID: KOL_DASHBOARD_SELECTORS.HISTORY_ON_HOLD_GOT_IT,
      }}
      twClassName="px-4 pt-6"
    />
  </KolDashboardSheet>
);

export default HistoryOnHoldSheet;
