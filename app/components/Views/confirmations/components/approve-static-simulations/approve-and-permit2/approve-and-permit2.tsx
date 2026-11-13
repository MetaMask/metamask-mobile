import React, { useState } from 'react';
import { View } from 'react-native';
import { BigNumber } from 'bignumber.js';
import { TransactionMeta } from '@metamask/transaction-controller';
import { Text } from '@metamask/design-system-react-native';

import I18n, { strings } from '../../../../../../../locales/i18n';
import { formatAmountMaxPrecision } from '../../../../../UI/SimulationDetails/formatAmount';
import { useStyles } from '../../../../../../component-library/hooks';
import { ApproveComponentIDs } from '../../../ConfirmationView.testIds';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useApproveTransactionData } from '../../../hooks/useApproveTransactionData';
import { useApproveTransactionActions } from '../../../hooks/useApproveTransactionActions';
import { TokenStandard } from '../../../types/token';
import InfoRow from '../../UI/info-row/info-row';
import AlertRow from '../../UI/info-row/alert-row';
import { RowAlertKey } from '../../UI/info-row/alert-row/constants';
import Address from '../../UI/info-row/info-value/address';
import InfoDate from '../../UI/info-row/info-value/info-date';
import { Pill } from '../../UI/pill';
import { ApproveMethod } from '../../../types/approve';
import { UINT48_MAX } from '../../../utils/date';
import { EditSpendingCapButton } from '../../edit-spending-cap-button';
import styleSheet from '../shared-styles';

export const ApproveAndPermit2 = () => {
  const { styles } = useStyles(styleSheet, {});
  const {
    approveMethod,
    amount,
    decimals,
    expiration,
    isRevoke,
    token,
    tokenBalance,
    tokenId,
    tokenStandard,
    tokenSymbol,
    rawAmount,
    spender,
  } = useApproveTransactionData();
  const { onSpendingCapUpdate } = useApproveTransactionActions();

  const transactionMetadata =
    useTransactionMetadataRequest() as TransactionMeta;
  const [now] = useState(() => Math.floor(Date.now() / 1000));
  // Permit2 treats 0 as the current block time
  const expirationTimestamp = Number(expiration) || now;
  const tokenAddress = (token ?? transactionMetadata?.txParams?.to) as string;
  const isPermit2 = approveMethod === ApproveMethod.PERMIT2_APPROVE;
  const isERC20 = tokenStandard === TokenStandard.ERC20;
  const isERC721 = tokenStandard === TokenStandard.ERC721;
  const shouldShow = isERC20 || (isERC721 && !isPermit2);

  if (!shouldShow) {
    return null;
  }

  if (isRevoke) {
    return (
      <>
        <InfoRow
          label={
            isERC20 ? strings('confirm.spending_cap') : strings('confirm.nfts')
          }
        >
          <View style={styles.amountAndAddressContainer}>
            <Address
              address={tokenAddress}
              chainId={transactionMetadata.chainId}
            />
          </View>
        </InfoRow>
        {isERC20 && (
          <InfoRow label={strings('confirm.permission_from')}>
            <Address
              address={spender ?? ''}
              chainId={transactionMetadata.chainId}
            />
          </InfoRow>
        )}
      </>
    );
  }

  return (
    <>
      <InfoRow
        label={
          isERC20
            ? strings('confirm.spending_cap')
            : strings('confirm.withdraw')
        }
      >
        <View style={styles.amountAndAddressContainer}>
          {isERC20 && (
            <EditSpendingCapButton
              spendingCapProps={{
                approveMethod: approveMethod as ApproveMethod,
                balance: tokenBalance ?? '0',
                decimals: decimals ?? 1,
                onSpendingCapUpdate,
                spendingCap: rawAmount ?? '',
                tokenSymbol,
              }}
            >
              <PillAndAddress
                amount={amount}
                isERC20
                tokenAddress={tokenAddress}
                tokenId={tokenId}
                transactionMetadata={transactionMetadata}
              />
            </EditSpendingCapButton>
          )}
          {!isERC20 && (
            <PillAndAddress
              isERC20={isERC20}
              tokenAddress={tokenAddress}
              tokenId={tokenId}
              transactionMetadata={transactionMetadata}
            />
          )}
        </View>
      </InfoRow>
      <AlertRow
        alertField={RowAlertKey.Spender}
        label={strings('confirm.spender')}
      >
        <Address
          address={spender ?? ''}
          chainId={transactionMetadata.chainId}
        />
      </AlertRow>
      {isPermit2 && (
        <InfoRow label={strings('confirm.expiration')}>
          {expirationTimestamp === UINT48_MAX ? (
            <Text>{strings('confirm.never_expires')}</Text>
          ) : (
            <InfoDate unixTimestamp={expirationTimestamp} />
          )}
        </InfoRow>
      )}
    </>
  );
};

interface PillAndAddressProps {
  amount?: string;
  isERC20: boolean;
  tokenAddress: string;
  tokenId?: string;
  transactionMetadata: TransactionMeta;
}

function formatDisplayAmount(amount: string | undefined): string {
  if (!amount) {
    return '';
  }
  const value = new BigNumber(amount);
  return value.isNaN() ? amount : formatAmountMaxPrecision(I18n.locale, value);
}

function PillAndAddress({
  amount,
  isERC20,
  tokenAddress,
  tokenId,
  transactionMetadata,
}: PillAndAddressProps) {
  return (
    <>
      <Pill
        testID={ApproveComponentIDs.SPENDING_CAP_VALUE}
        text={isERC20 ? formatDisplayAmount(amount) : `#${tokenId}`}
      />
      <Address address={tokenAddress} chainId={transactionMetadata.chainId} />
    </>
  );
}
