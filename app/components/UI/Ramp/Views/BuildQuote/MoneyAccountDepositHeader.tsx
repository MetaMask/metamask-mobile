import React from 'react';
import { HeaderStandard, IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyAccountDepositTooltip } from '../../../Money/hooks/useMoneyAccountDepositTooltip';
import { BUILD_QUOTE_TEST_IDS } from './BuildQuote.testIds';

interface MoneyAccountDepositHeaderProps {
  onBack: () => void;
}

function MoneyAccountDepositHeader({ onBack }: MoneyAccountDepositHeaderProps) {
  const { TooltipNode, onInfoPress } = useMoneyAccountDepositTooltip(
    BUILD_QUOTE_TEST_IDS.MONEY_ACCOUNT_DEPOSIT_INFO_TOOLTIP,
  );

  return (
    <>
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
      {TooltipNode}
    </>
  );
}

export default MoneyAccountDepositHeader;
