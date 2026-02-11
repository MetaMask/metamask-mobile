import React, { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../reducers';
import { selectSelectedInternalAccountByScope } from '../../../../../../selectors/multichainAccounts/accounts';
import { EVM_SCOPE } from '../../../../../UI/Earn/constants/networks';
import {
  useIsTransactionPayLoading,
  useTransactionPayQuotes,
} from '../../../hooks/pay/useTransactionPayData';
import InfoRow from '../../UI/info-row';
import { InfoRowSkeleton, InfoRowVariant } from '../../UI/info-row/info-row';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { getReceiveOutputForRecipient } from '../../../utils/relayQuotes/getReceiveOutputForRecipient';
import I18n from '../../../../../../../locales/i18n';
import { formatAmount } from '../../../../../UI/SimulationDetails/formatAmount';

export interface RelayYouReceiveRowProps {
  label: string;
  testID?: string;
}

export function RelayYouReceiveRow({ label, testID }: RelayYouReceiveRowProps) {
  const isLoading = useIsTransactionPayLoading();
  const selectedEvmAddress = useSelector(
    (state: RootState) =>
      selectSelectedInternalAccountByScope(state)(EVM_SCOPE)?.address,
  );

  const quotes = useTransactionPayQuotes();

  const receiveOutput = useMemo(() => {
    if (isLoading) {
      return undefined;
    }

    return getReceiveOutputForRecipient({
      quotes,
      recipientAddress: selectedEvmAddress,
    });
  }, [isLoading, quotes, selectedEvmAddress]);

  if (isLoading) {
    return <InfoRowSkeleton testId="relay-you-receive-row-skeleton" />;
  }

  // Intentionally hide the row if no matching output exists for the active EVM address.
  if (!receiveOutput) {
    return null;
  }

  const formattedReceiveAmount = formatAmount(
    I18n.locale,
    new BigNumber(receiveOutput.amount),
  );

  return (
    <InfoRow label={label} rowVariant={InfoRowVariant.Small} testID={testID}>
      <Text variant={TextVariant.BodyMDMedium} color={TextColor.Alternative}>
        {formattedReceiveAmount} {receiveOutput.symbol}
      </Text>
    </InfoRow>
  );
}
