import React, { useCallback } from 'react';
import { Linking } from 'react-native';
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
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import ArrowSquareOutIcon from '../../../../../images/rewards/arrow-square-out.svg';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
import { KOL_TAX_FORM_URL } from './rewardsUiFixtures';
import KolDashboardSheet from './KolDashboardSheet';

interface TaxFormRequiredSheetProps {
  isVisible: boolean;
  onClose: () => void;
  /** Runs once the user leaves for the partner tax form. */
  onContinue: () => void;
}

const TaxFormRequiredSheet: React.FC<TaxFormRequiredSheetProps> = ({
  isVisible,
  onClose,
  onContinue,
}) => {
  const tw = useTailwind();

  const handleContinue = useCallback(() => {
    Linking.openURL(KOL_TAX_FORM_URL).catch((error) => {
      Logger.log('Error while opening tax form URL', error);
    });
    onContinue();
  }, [onContinue]);

  return (
    <KolDashboardSheet
      isVisible={isVisible}
      onClose={onClose}
      testID={KOL_DASHBOARD_SELECTORS.TAX_FORM_SHEET}
    >
      <BottomSheetHeader
        onClose={onClose}
        testID={KOL_DASHBOARD_SELECTORS.TAX_FORM_TITLE}
      >
        {strings('rewards.kol.tax_form_title')}
      </BottomSheetHeader>
      <Box twClassName="px-4">
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={KOL_DASHBOARD_SELECTORS.TAX_FORM_DESCRIPTION}
        >
          {strings('rewards.kol.tax_form_description')}
        </Text>
      </Box>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Vertical}
        secondaryButtonProps={{
          children: strings('rewards.kol.tax_form_remind_later'),
          onPress: onClose,
          size: ButtonSize.Lg,
          testID: KOL_DASHBOARD_SELECTORS.TAX_FORM_REMIND_LATER,
        }}
        primaryButtonProps={{
          children: strings('rewards.kol.tax_form_continue'),
          onPress: handleContinue,
          size: ButtonSize.Lg,
          endAccessory: (
            <ArrowSquareOutIcon
              fill="currentColor"
              style={tw.style('h-5 w-5 text-primary-inverse')}
            />
          ),
          testID: KOL_DASHBOARD_SELECTORS.TAX_FORM_CONTINUE,
        }}
        twClassName="px-4 pt-6"
      />
    </KolDashboardSheet>
  );
};

export default TaxFormRequiredSheet;
