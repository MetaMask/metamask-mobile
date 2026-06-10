import React from 'react';
import { useSelector } from 'react-redux';
import { type Hex } from '@metamask/utils';
import { Box, Text } from '@metamask/design-system-react-native';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import AvatarAccount from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import { strings } from '../../../../../../locales/i18n';
import { NameType } from '../../../Name/Name.types';
import { useAccountNames } from '../../../../hooks/DisplayName/useAccountNames';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { useTransactionDetails } from '../../../../Views/confirmations/hooks/activity/useTransactionDetails';
import { TransactionDetailsRow } from '../../../../Views/confirmations/components/activity/transaction-details-row/transaction-details-row';
import useNetworkInfo from '../../../../Views/confirmations/hooks/useNetworkInfo';
import type { MetamaskPayWithOrigin } from '../../../../../core/Engine/controllers/transaction-controller/event-handlers/persist-originating-address';

export function MoneyTransactionDetailsFromRow() {
  const { transactionMeta } = useTransactionDetails();
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const moneyAddress = primaryMoneyAccount?.address;

  // `originatingAddress` is a mobile-side extension of `MetamaskPayMetadata`
  // (see MetamaskPayWithOrigin). It records the user's EOA that initiated the
  // deposit, since EIP-7702 delegated transactions set `txParams.from` to the
  // batch executor, not the user's account. Transactions created before this
  // field was introduced will not have it — we fall back to "Money Account".
  const originatingAddress = (
    transactionMeta.metamaskPay as MetamaskPayWithOrigin | undefined
  )?.originatingAddress;

  const chainId = (transactionMeta.metamaskPay?.chainId ??
    transactionMeta.chainId) as Hex;

  const { networkName, networkImage } = useNetworkInfo(chainId);

  const [accountGroupName] = useAccountNames([
    {
      value: originatingAddress ?? '',
      variation: chainId,
      type: NameType.EthereumAddress,
    },
  ]);

  const displayAddress = originatingAddress ?? moneyAddress;
  const displayName =
    (originatingAddress && accountGroupName) ||
    strings('transaction_details.label.money_account');

  if (!displayAddress) {
    return null;
  }

  return (
    <TransactionDetailsRow label={strings('transaction_details.label.from')}>
      <Box twClassName="flex-row items-center gap-1.5">
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
          <AvatarAccount accountAddress={displayAddress} size={AvatarSize.Sm} />
        </BadgeWrapper>
        <Text>{displayName}</Text>
      </Box>
    </TransactionDetailsRow>
  );
}
