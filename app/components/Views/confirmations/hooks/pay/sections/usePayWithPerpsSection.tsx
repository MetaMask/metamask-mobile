import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { BigNumber } from 'bignumber.js';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { selectPerpsAccountState } from '../../../../../UI/Perps/selectors/perpsController';
import { useIsPerpsBalanceSelected } from '../../../../../UI/Perps/hooks/useIsPerpsBalanceSelected';
import { usePerpsPaymentToken } from '../../../../../UI/Perps/hooks/usePerpsPaymentToken';
import { usePerpsTrading } from '../../../../../UI/Perps/hooks/usePerpsTrading';
import { markPerpsPaymentTokenSelection } from '../../../../../UI/Perps/utils/perpsPaymentTokenSelection';
import useApprovalRequest from '../../useApprovalRequest';
import { useTransactionMetadataRequest } from '../../transactions/useTransactionMetadataRequest';
import {
  PayWithRowConfig,
  PayWithSectionConfig,
} from '../../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';
import { hasTransactionType } from '../../../utils/transaction';
import { useClearPaymentOverride } from './useClearPaymentOverride';

export const PAY_WITH_PERPS_SECTION_TEST_ID = 'pay-with-section-perps';
export const PAY_WITH_PERPS_BALANCE_ROW_TEST_ID =
  'pay-with-perps-section-balance-row';

export function usePayWithPerpsSection(): PayWithSectionConfig | null {
  const navigation = useNavigation<AppNavigationProp>();
  const transactionMeta = useTransactionMetadataRequest();
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const perpsAccount = useSelector(selectPerpsAccountState);
  const { onPaymentTokenChange } = usePerpsPaymentToken();
  const isPerpsBalanceSelected = useIsPerpsBalanceSelected();
  const { depositWithConfirmation } = usePerpsTrading();
  const { onReject } = useApprovalRequest();

  const isPerpsDepositAndOrder = hasTransactionType(transactionMeta, [
    TransactionType.perpsDepositAndOrder,
  ]);

  const balance = useMemo(
    () => formatFiat(new BigNumber(perpsAccount?.spendableBalance ?? '0')),
    [formatFiat, perpsAccount?.spendableBalance],
  );

  const clearPaymentOverride = useClearPaymentOverride();

  const handleSelect = useCallback(() => {
    // an explicit row press is a selection even when it does not
    // change the pay token (e.g. re-selecting the already-selected balance).
    markPerpsPaymentTokenSelection();
    onPaymentTokenChange(null);
    clearPaymentOverride();
    navigation.goBack();
  }, [clearPaymentOverride, navigation, onPaymentTokenChange]);

  const handleAdd = useCallback(async () => {
    onReject();
    try {
      await depositWithConfirmation();
      navigation.navigate(
        Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
        { showPerpsHeader: true },
      );
    } catch {
      // Deposit flow handles errors (e.g. user rejection or missing network).
    }
  }, [depositWithConfirmation, navigation, onReject]);

  return useMemo(() => {
    if (!isPerpsDepositAndOrder) {
      return null;
    }

    const row: PayWithRowConfig = {
      id: 'perps-balance',
      icon: React.createElement(Icon, {
        name: IconName.Candlestick,
        size: IconSize.Md,
        color: IconColor.IconAlternative,
      }),
      title: strings('confirm.pay_with_bottom_sheet.perps_balance'),
      subtitle: strings('confirm.pay_with_bottom_sheet.available_balance', {
        balance,
      }),
      isSelected: isPerpsBalanceSelected,
      trailingElement: (
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Sm}
          onPress={handleAdd}
        >
          {strings('confirm.pay_with_bottom_sheet.add')}
        </Button>
      ),
      onPress: handleSelect,
      testID: PAY_WITH_PERPS_BALANCE_ROW_TEST_ID,
    };

    return {
      id: 'perps',
      title: strings('confirm.pay_with_bottom_sheet.perps'),
      testID: PAY_WITH_PERPS_SECTION_TEST_ID,
      rows: [row],
    };
  }, [
    balance,
    handleAdd,
    handleSelect,
    isPerpsBalanceSelected,
    isPerpsDepositAndOrder,
  ]);
}
