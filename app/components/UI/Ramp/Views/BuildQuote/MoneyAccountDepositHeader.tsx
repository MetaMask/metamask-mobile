import React from 'react';
import { HeaderStandard, IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { BUILD_QUOTE_TEST_IDS } from './BuildQuote.testIds';

interface MoneyAccountDepositHeaderProps {
  onBack: () => void;
  onInfoPress: () => void;
}

function MoneyAccountDepositHeader({
  onBack,
  onInfoPress,
}: MoneyAccountDepositHeaderProps) {
  return (
    <HeaderStandard
      title={strings('money.add_money_sheet.title')}
      onBack={onBack}
      backButtonProps={{ testID: BUILD_QUOTE_TEST_IDS.BACK_BUTTON }}
      endButtonIconProps={[
        {
          iconName: IconName.Info,
          onPress: onInfoPress,
          testID: BUILD_QUOTE_TEST_IDS.MONEY_ACCOUNT_DEPOSIT_INFO_BUTTON,
        },
      ]}
      includesTopInset
    />
  );
}

export default MoneyAccountDepositHeader;
