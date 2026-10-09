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

interface TaxFormPendingSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

const TaxFormPendingSheet: React.FC<TaxFormPendingSheetProps> = ({
  isVisible,
  onClose,
}) => (
  <KolDashboardSheet
    isVisible={isVisible}
    onClose={onClose}
    testID={KOL_DASHBOARD_SELECTORS.TAX_FORM_PENDING_SHEET}
  >
    <BottomSheetHeader
      onClose={onClose}
      testID={KOL_DASHBOARD_SELECTORS.TAX_FORM_PENDING_TITLE}
    >
      {strings('rewards.kol.tax_form_pending_title')}
    </BottomSheetHeader>
    <Box twClassName="px-4">
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        testID={KOL_DASHBOARD_SELECTORS.TAX_FORM_PENDING_DESCRIPTION}
      >
        {strings('rewards.kol.tax_form_pending_description')}
      </Text>
    </Box>
    <BottomSheetFooter
      primaryButtonProps={{
        children: strings('rewards.kol.tax_form_pending_got_it'),
        onPress: onClose,
        size: ButtonSize.Lg,
        testID: KOL_DASHBOARD_SELECTORS.TAX_FORM_PENDING_GOT_IT,
      }}
      twClassName="px-4 pt-6"
    />
  </KolDashboardSheet>
);

export default TaxFormPendingSheet;
