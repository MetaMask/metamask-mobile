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
import { POLYGON_PUSD } from '../../../constants/predict';
import { PREDICT_BALANCE_CHAIN_ID } from '../../../../../UI/Predict/constants/transactions';
import { usePredictBalance } from '../../../../../UI/Predict/hooks/usePredictBalance';
import { usePredictPaymentToken } from '../../../../../UI/Predict/hooks/usePredictPaymentToken';
import { selectSingleTokenByAddressAndChainId } from '../../../../../../selectors/tokensController';
import { RootState } from '../../../../../../reducers';
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
  const navigation = useNavigation();
  const transactionMeta = useTransactionMetadataRequest();
  const { onReject } = useApprovalRequest();
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const { data: predictBalance = 0 } = usePredictBalance();
  const { resetSelectedPaymentToken } = usePredictPaymentToken();
  const pusdToken = useSelector((state: RootState) =>
    selectSingleTokenByAddressAndChainId(
      state,
      POLYGON_PUSD.address,
      PREDICT_BALANCE_CHAIN_ID,
    ),
  );

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
      icon: React.createElement(Image, {
        source: { uri: pusdToken?.image ?? '' },
        style: { width: 24, height: 24 },
      }),
      title: strings('confirm.pay_with_bottom_sheet.predict_account'),
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
      testID: PAY_WITH_PREDICT_BALANCE_ROW_TEST_ID,
    };

    return {
      id: 'predict',
      title: strings('confirm.pay_with_bottom_sheet.predict'),
      testID: PAY_WITH_PREDICT_SECTION_TEST_ID,
      rows: [row],
    };
  }, [balance, handleAdd, handleSelect, isPredictDepositAndOrder, pusdToken]);
}
