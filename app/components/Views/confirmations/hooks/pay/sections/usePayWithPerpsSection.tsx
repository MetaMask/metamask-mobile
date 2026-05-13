import React, { useCallback, useMemo } from 'react';
import { Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { BigNumber } from 'bignumber.js';
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { selectPerpsAccountState } from '../../../../../UI/Perps/selectors/perpsController';
import { PERPS_BALANCE_ICON_URI } from '../../../../../UI/Perps/hooks/usePerpsBalanceTokenFilter';
import { usePerpsPaymentToken } from '../../../../../UI/Perps/hooks/usePerpsPaymentToken';
import { usePerpsTrading } from '../../../../../UI/Perps/hooks/usePerpsTrading';
import useApprovalRequest from '../../useApprovalRequest';
import { useTransactionMetadataRequest } from '../../transactions/useTransactionMetadataRequest';
import {
  PayWithRowConfig,
  PayWithSectionConfig,
} from '../../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';
import { hasTransactionType } from '../../../utils/transaction';

export const PAY_WITH_PERPS_SECTION_TEST_ID = 'pay-with-section-perps';
export const PAY_WITH_PERPS_BALANCE_ROW_TEST_ID =
  'pay-with-perps-section-balance-row';

export function usePayWithPerpsSection(): PayWithSectionConfig | null {
  const navigation = useNavigation();
  const transactionMeta = useTransactionMetadataRequest();
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const perpsAccount = useSelector(selectPerpsAccountState);
  const { onPaymentTokenChange } = usePerpsPaymentToken();
  const { depositWithConfirmation } = usePerpsTrading();
  const { onReject } = useApprovalRequest();

  const isPerpsDepositAndOrder = hasTransactionType(transactionMeta, [
    TransactionType.perpsDepositAndOrder,
  ]);

  const balance = useMemo(
    () => formatFiat(new BigNumber(perpsAccount?.spendableBalance ?? '0')),
    [formatFiat, perpsAccount?.spendableBalance],
  );

  const handleSelect = useCallback(() => {
    onPaymentTokenChange(null);
  }, [onPaymentTokenChange]);

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
      icon: React.createElement(Image, {
        source: { uri: PERPS_BALANCE_ICON_URI },
        style: { width: 24, height: 24 },
      }),
      title: strings('confirm.pay_with_bottom_sheet.perps_account'),
      subtitle: strings('confirm.pay_with_bottom_sheet.available_balance', {
        balance,
      }),
      isSelected: false,
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
  }, [balance, handleAdd, handleSelect, isPerpsDepositAndOrder]);
}
