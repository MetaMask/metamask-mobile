import React from 'react';
import { useSelector } from 'react-redux';
import { type Hex } from '@metamask/utils';
import { TransactionType } from '@metamask/transaction-controller';
import Text, {
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import AvatarAccount from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import Badge, {
  BadgeVariant,
} from '../../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../component-library/components/Badges/BadgeWrapper';
import { Box } from '../../../../../UI/Box/Box';
import { AlignItems, FlexDirection } from '../../../../../UI/Box/box.types';
import { NameType } from '../../../../../UI/Name/Name.types';
import { useAccountNames } from '../../../../../hooks/DisplayName/useAccountNames';
import { strings } from '../../../../../../../locales/i18n';
import { selectPrimaryMoneyAccount } from '../../../../../../selectors/moneyAccountController';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { useIsMoneyAccountContext } from '../../../hooks/activity/useIsMoneyAccountContext';
import { hasTransactionType } from '../../../utils/transaction';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import useNetworkInfo from '../../../hooks/useNetworkInfo';

const ACCOUNT_TYPES = [
  TransactionType.perpsWithdraw,
  TransactionType.predictClaim,
  TransactionType.predictWithdraw,
];

const WITHDRAW_TYPES = [TransactionType.moneyAccountWithdraw];

// Money flowing FROM perps/predict INTO money account (inflow)
const PERPS_PREDICT_INFLOW_TYPES = [
  TransactionType.perpsWithdraw,
  TransactionType.predictWithdraw,
];

// Money flowing FROM money account TO perps/predict (outflow)
const PERPS_PREDICT_OUTFLOW_TYPES = [
  TransactionType.perpsDeposit,
  TransactionType.predictDeposit,
];

export function TransactionDetailsAccountRow() {
  const { transactionMeta } = useTransactionDetails();
  const isMoneyContext = useIsMoneyAccountContext();
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const moneyAddress = primaryMoneyAccount?.address;

  const chainId = (transactionMeta.metamaskPay?.chainId ??
    transactionMeta.chainId) as Hex;

  const { networkName, networkImage } = useNetworkInfo(chainId);

  const {
    txParams: { from },
  } = transactionMeta;

  const accountName = useAccountNames([
    {
      value: from,
      variation: transactionMeta.chainId,
      type: NameType.EthereumAddress,
    },
  ])?.[0];

  const isWithdraw =
    hasTransactionType(transactionMeta, WITHDRAW_TYPES) && moneyAddress;

  const isAccountType = hasTransactionType(transactionMeta, ACCOUNT_TYPES);

  // perpsWithdraw/predictWithdraw in money context: From = Perps/Predict account
  const isInflowFromService =
    isMoneyContext &&
    hasTransactionType(transactionMeta, PERPS_PREDICT_INFLOW_TYPES);

  // perpsDeposit/predictDeposit in money context: From = Money account
  const isOutflowToService =
    isMoneyContext &&
    hasTransactionType(transactionMeta, PERPS_PREDICT_OUTFLOW_TYPES);

  if (isInflowFromService) {
    const fromLabel = hasTransactionType(transactionMeta, [
      TransactionType.perpsWithdraw,
    ])
      ? strings('transaction_details.label.perps_account')
      : strings('transaction_details.label.predictions_account');

    return (
      <TransactionDetailsRow label={strings('transaction_details.label.from')}>
        <Box
          flexDirection={FlexDirection.Row}
          alignItems={AlignItems.center}
          gap={6}
        >
          <AvatarAccount accountAddress={from} size={AvatarSize.Sm} />
          <Text>{fromLabel}</Text>
        </Box>
      </TransactionDetailsRow>
    );
  }

  if (isOutflowToService) {
    return (
      <TransactionDetailsRow label={strings('transaction_details.label.from')}>
        <Box
          flexDirection={FlexDirection.Row}
          alignItems={AlignItems.center}
          gap={6}
        >
          <AvatarAccount
            accountAddress={moneyAddress ?? from}
            size={AvatarSize.Sm}
          />
          <Text>{strings('transaction_details.label.money_account')}</Text>
        </Box>
      </TransactionDetailsRow>
    );
  }

  if (!isWithdraw && !isAccountType) {
    return null;
  }

  const label = isWithdraw
    ? strings('transaction_details.label.from')
    : strings('transaction_details.label.account');

  const avatarAddress = isWithdraw ? (moneyAddress as string) : from;

  const displayText = isWithdraw
    ? strings('transaction_details.label.money_account')
    : (accountName ?? from);

  const textColor = isWithdraw ? undefined : TextColor.Alternative;

  return (
    <TransactionDetailsRow label={label}>
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        gap={6}
      >
        <BadgeWrapper
          badgePosition={BadgePosition.BottomRight}
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              imageSource={networkImage}
              name={networkName}
            />
          }
        >
          <AvatarAccount accountAddress={avatarAddress} size={AvatarSize.Sm} />
        </BadgeWrapper>
        <Text color={textColor}>{displayText}</Text>
      </Box>
    </TransactionDetailsRow>
  );
}
