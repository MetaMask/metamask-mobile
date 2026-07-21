import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
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
import { usePredictBalance } from '../../../../../UI/Predict/hooks/usePredictBalance';
import { usePredictPaymentToken } from '../../../../../UI/Predict/hooks/usePredictPaymentToken';
import { useTransactionMetadataRequest } from '../../transactions/useTransactionMetadataRequest';
import {
  PayWithRowConfig,
  PayWithSectionConfig,
} from '../../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';
import { hasTransactionType } from '../../../utils/transaction';
import { dismissActivePreviewSheet } from '../../../../../UI/Predict/contexts';
import useApprovalRequest from '../../useApprovalRequest';

export const PAY_WITH_PREDICT_SECTION_TEST_ID = 'pay-with-section-predict';
export const PAY_WITH_PREDICT_BALANCE_ROW_TEST_ID =
  'pay-with-predict-section-balance-row';

export function usePayWithPredictSection(): PayWithSectionConfig | null {
  const navigation = useNavigation<AppNavigationProp>();
  const transactionMeta = useTransactionMetadataRequest();
  const { onReject } = useApprovalRequest();
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const { data: predictBalance = 0 } = usePredictBalance();
  const { resetSelectedPaymentToken, isPredictBalanceSelected } =
    usePredictPaymentToken();

  const isPredictDepositAndOrder = hasTransactionType(transactionMeta, [
    TransactionType.predictDepositAndOrder,
  ]);

  const balance = useMemo(
    () => formatFiat(new BigNumber(String(predictBalance))),
    [formatFiat, predictBalance],
  );

  const handleSelect = useCallback(() => {
    resetSelectedPaymentToken();
    navigation.goBack();
  }, [navigation, resetSelectedPaymentToken]);

  const handleAdd = useCallback(() => {
    onReject();
    dismissActivePreviewSheet();
    navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
      screen: Routes.PREDICT.MODALS.ADD_FUNDS_SHEET,
      params: { autoDeposit: true },
    });
  }, [navigation, onReject]);

  return useMemo(() => {
    if (!isPredictDepositAndOrder) {
      return null;
    }

    const row: PayWithRowConfig = {
      id: 'predict-balance',
      icon: React.createElement(Icon, {
        name: IconName.Predictions,
        size: IconSize.Md,
        color: IconColor.IconAlternative,
      }),
      title: strings('confirm.pay_with_bottom_sheet.predict_balance'),
      subtitle: strings('confirm.pay_with_bottom_sheet.available_balance', {
        balance,
      }),
      isSelected: isPredictBalanceSelected,
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
      testID: PAY_WITH_PREDICT_BALANCE_ROW_TEST_ID,
    };

    return {
      id: 'predict',
      title: strings('confirm.pay_with_bottom_sheet.predict'),
      testID: PAY_WITH_PREDICT_SECTION_TEST_ID,
      rows: [row],
    };
  }, [
    balance,
    handleAdd,
    handleSelect,
    isPredictBalanceSelected,
    isPredictDepositAndOrder,
  ]);
}
