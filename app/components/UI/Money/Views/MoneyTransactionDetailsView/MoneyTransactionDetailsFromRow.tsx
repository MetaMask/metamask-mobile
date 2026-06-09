import React from 'react';
import { useSelector } from 'react-redux';
import { type Hex } from '@metamask/utils';
import Text from '../../../../../component-library/components/Texts/Text';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import AvatarAccount from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import { Box } from '../../../Box/Box';
import { AlignItems, FlexDirection } from '../../../Box/box.types';
import { strings } from '../../../../../../locales/i18n';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { useTransactionDetails } from '../../../../Views/confirmations/hooks/activity/useTransactionDetails';
import { TransactionDetailsRow } from '../../../../Views/confirmations/components/activity/transaction-details-row/transaction-details-row';
import useNetworkInfo from '../../../../Views/confirmations/hooks/useNetworkInfo';

export function MoneyTransactionDetailsFromRow() {
  const { transactionMeta } = useTransactionDetails();
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const moneyAddress = primaryMoneyAccount?.address;

  // TODO: EIP-7702 delegated transactions store the batch executor as
  // txParams.from, not the user's originating account. The real originating
  // account (the rootDelegator) is only available on-chain (in internal
  // transactions and event logs), not in TransactionController state.
  // Until the controller persists the originating account, we show
  // "Money Account" as the from label for all money transactions.
  const chainId = (transactionMeta.metamaskPay?.chainId ??
    transactionMeta.chainId) as Hex;

  const { networkName, networkImage } = useNetworkInfo(chainId);

  if (!moneyAddress) {
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
        <Text>
          {strings('transaction_details.label.money_account')}
        </Text>
      </Box>
    </TransactionDetailsRow>
  );
}
