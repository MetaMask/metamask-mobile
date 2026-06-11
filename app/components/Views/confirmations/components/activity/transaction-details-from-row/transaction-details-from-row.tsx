import React from 'react';
import { useSelector } from 'react-redux';
import { type Hex } from '@metamask/utils';
import { TransactionType } from '@metamask/transaction-controller';
import Text from '../../../../../../component-library/components/Texts/Text';
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
import { strings } from '../../../../../../../locales/i18n';
import { selectPrimaryMoneyAccount } from '../../../../../../selectors/moneyAccountController';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { hasTransactionType } from '../../../utils/transaction';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import useNetworkInfo from '../../../hooks/useNetworkInfo';

const WITHDRAW_TYPES: TransactionType[] = [
  TransactionType.moneyAccountWithdraw,
];

export function TransactionDetailsFromRow() {
  const { transactionMeta } = useTransactionDetails();
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const moneyAddress = primaryMoneyAccount?.address;

  const chainId = (transactionMeta.metamaskPay?.chainId ??
    transactionMeta.chainId) as Hex;

  const { networkName, networkImage } = useNetworkInfo(chainId);

  if (!hasTransactionType(transactionMeta, WITHDRAW_TYPES) || !moneyAddress) {
    return null;
  }

  return (
    <TransactionDetailsRow label={strings('transaction_details.label.from')}>
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
          <AvatarAccount accountAddress={moneyAddress} size={AvatarSize.Sm} />
        </BadgeWrapper>
        <Text>{strings('transaction_details.label.money_account')}</Text>
      </Box>
    </TransactionDetailsRow>
  );
}
