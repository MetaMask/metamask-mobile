import React, { memo } from 'react';
import { Image } from 'react-native';
import { useSelector } from 'react-redux';
import {
  CHAIN_IDS,
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontFamily,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import perpsPayTokenIcon from '../../../../../../images/perps-pay-token-icon.png';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { selectPerpsLighterProviderEnabledFlag } from '../../../../../UI/Perps/selectors/featureFlags';
import { isLighterProviderEnabled } from '../../../../../UI/Perps/utils/lighterFeatureFlags';
import { ConfirmationRowComponentIDs } from '../../../ConfirmationView.testIds';
import { POLYGON_PUSD } from '../../../constants/predict';
import { useIsMoneyAccountFlagDefault } from '../../../hooks/pay/useIsMoneyAccountFlagDefault';
import { useIsMoneyAccountPaymentOverride } from '../../../hooks/pay/useIsMoneyAccountPaymentOverride';
import { useTransactionPaySelectedFiatPaymentMethod } from '../../../hooks/pay/useTransactionPaySelectedFiatPaymentMethod';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import {
  ConfirmationParams,
  PayWithOption,
} from '../../confirm/confirm-component';
import { TokenIcon, TokenIconVariant } from '../../token-icon';
import InfoRow, { InfoRowVariant } from '../../UI/info-row/info-row';

export const DepositToRowIDs = {
  ROW: ConfirmationRowComponentIDs.DEPOSIT_TO,
  PERPS_ICON: 'deposit-to-perps-icon',
  VALUE: 'deposit-to-value',
} as const;

function DepositToRowComponent({
  isResultReady,
}: { isResultReady?: boolean } = {}) {
  const tw = useTailwind();
  const transactionMeta = useTransactionMetadataRequest();
  const { payWithOption } = useParams<ConfirmationParams>({});
  const isDefaultMoneyAccount = useIsMoneyAccountFlagDefault();
  const isMoneyAccountOverride = useIsMoneyAccountPaymentOverride();
  const { payToken } = useTransactionPayToken();
  const selectedFiatPaymentMethod =
    useTransactionPaySelectedFiatPaymentMethod();
  const lighterProviderFlagEnabled = useSelector(
    selectPerpsLighterProviderEnabledFlag,
  );

  const isPerpsDeposit = hasTransactionType(transactionMeta, [
    TransactionType.perpsDeposit,
  ]);
  const isPredictDeposit = hasTransactionType(transactionMeta, [
    TransactionType.predictDeposit,
  ]);

  if (!isPerpsDeposit && !isPredictDeposit) {
    return null;
  }

  if (
    payWithOption === PayWithOption.MoneyAccount ||
    isMoneyAccountOverride ||
    selectedFiatPaymentMethod ||
    (isDefaultMoneyAccount && !payToken && !isResultReady)
  ) {
    return null;
  }

  // PerpsReceiveToRow renders its own "To" row when the Lighter picker is enabled.
  const isPerpsReceiveToVisible =
    isPerpsDeposit && isLighterProviderEnabled() && lighterProviderFlagEnabled;

  if (isPerpsReceiveToVisible) {
    return null;
  }

  const destinationLabel = isPerpsDeposit
    ? strings('confirm.pay_with_bottom_sheet.perps_balance')
    : strings('confirm.pay_with_bottom_sheet.predict_balance');

  return (
    <InfoRow
      testID={DepositToRowIDs.ROW}
      label={strings('confirm.label.to')}
      rowVariant={InfoRowVariant.Small}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-2"
      >
        {isPerpsDeposit ? (
          <Image
            source={perpsPayTokenIcon}
            style={tw.style('h-6 w-6 rounded-full')}
            accessible={false}
            testID={DepositToRowIDs.PERPS_ICON}
          />
        ) : (
          <TokenIcon
            address={POLYGON_PUSD.address}
            chainId={CHAIN_IDS.POLYGON}
            symbol={POLYGON_PUSD.symbol}
            variant={TokenIconVariant.Row}
          />
        )}
        <Text
          variant={TextVariant.BodyMd}
          fontFamily={FontFamily.Default}
          fontWeight={FontWeight.Regular}
          color={TextColor.TextDefault}
          testID={DepositToRowIDs.VALUE}
        >
          {destinationLabel}
        </Text>
      </Box>
    </InfoRow>
  );
}

export const DepositToRow = memo(DepositToRowComponent);
