import React, { useCallback, useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { type Hex } from '@metamask/utils';
import BigNumber from 'bignumber.js';
import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { RPC } from '../../../../../constants/network';
import {
  findBlockExplorerUrlForChain,
  getBlockExplorerTxUrl,
} from '../../../../../util/networks';
import { formatAddress } from '../../../../../util/address';
import { useStyles } from '../../../../../component-library/hooks';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import AvatarAccount from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import AvatarNetwork from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { trackBlockExplorerLinkClicked } from '../../../../../util/analytics/externalLinkTracking';
import { Box } from '../../../Box/Box';
import { AlignItems, FlexDirection } from '../../../Box/box.types';
import Name from '../../../Name/Name';
import { NameType } from '../../../Name/Name.types';
import { TransactionDetailDivider } from '../../../../Views/confirmations/components/activity/transaction-detail-divider/transaction-detail-divider';
import { TransactionDetailsDateRow } from '../../../../Views/confirmations/components/activity/transaction-details-date-row';
import { TransactionDetailsRow } from '../../../../Views/confirmations/components/activity/transaction-details-row/transaction-details-row';
import { TransactionDetailsStatus } from '../../../../Views/confirmations/components/activity/transaction-details-status';
import { TransactionDetailsNetworkFeeRow } from '../../../../Views/confirmations/components/activity/transaction-details-network-fee-row/transaction-details-network-fee-row';
import { TransactionDetailsBridgeFeeRow } from '../../../../Views/confirmations/components/activity/transaction-details-bridge-fee-row/transaction-details-bridge-fee-row';
import { TransactionDetailsPaidWithRow } from '../../../../Views/confirmations/components/activity/transaction-details-paid-with-row/transaction-details-paid-with-row';
import {
  TokenIcon,
  TokenIconVariant,
} from '../../../../Views/confirmations/components/token-icon';
import { useTransactionDetails } from '../../../../Views/confirmations/hooks/activity/useTransactionDetails';
import useNetworkInfo from '../../../../Views/confirmations/hooks/useNetworkInfo';
import { usePayFiatFormatter } from '../../../../Views/confirmations/hooks/pay/usePayFiatFormatter';
import { selectMoneyEnableActivityDetailsBlockexplorerLinkFlag } from '../../selectors/featureFlags';
import { getTokenTransferData } from '../../../../Views/confirmations/utils/transaction-pay';
import { parseStandardTokenTransactionData } from '../../../../Views/confirmations/utils/transaction';
import { useAccountNames } from '../../../../hooks/DisplayName/useAccountNames';
import {
  getMusdDisplayAmountFromTransactionMeta,
  resolveMusdTransferMeta,
} from '../../constants/activityStyles';
import styleSheet from './MoneySentDetails.styles';

/**
 * Decodes the ERC-20 transfer recipient (`_to`) from the nested mUSD transfer of
 * a Money Account withdrawal. `txParams.to` points at the token/teller contract,
 * not the actual recipient, so we read it from the decoded transfer calldata.
 */
function useRecipient(): Hex | undefined {
  const { transactionMeta } = useTransactionDetails();
  return useMemo(() => {
    const { data } = getTokenTransferData(transactionMeta) ?? {};
    if (!data) {
      return undefined;
    }
    const parsed = parseStandardTokenTransactionData(data);
    return parsed?.args?._to?.toString() as Hex | undefined;
  }, [transactionMeta]);
}

interface MoneySentDetailsProps {
  /**
   * Closes the host bottom sheet and runs `navigate` once it has finished
   * dismissing. Navigating while the sheet's transparent modal is still
   * presented pushes the WebView behind it and strands the overlay, so the
   * explorer link must defer navigation until after the sheet is gone.
   */
  onCloseSheet: (navigate: () => void) => void;
}

export function MoneySentDetails({ onCloseSheet }: MoneySentDetailsProps) {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { transactionMeta } = useTransactionDetails();
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const blockExplorerLinkEnabled = useSelector(
    selectMoneyEnableActivityDetailsBlockexplorerLinkFlag,
  );

  const chainId = transactionMeta.chainId as Hex;
  const from = transactionMeta.txParams?.from;
  const recipient = useRecipient();

  const tokenMeta = resolveMusdTransferMeta(transactionMeta);
  const primaryAmount =
    getMusdDisplayAmountFromTransactionMeta(transactionMeta);

  const accountName = useAccountNames(
    from
      ? [{ value: from, variation: chainId, type: NameType.EthereumAddress }]
      : [],
  )?.[0];

  const { networkName, networkImage } = useNetworkInfo(chainId);

  // `metamaskPay` fees are USD-denominated for withdrawals (moneyAccountWithdraw
  // is not a USER_CURRENCY_TYPE), so the pay formatter resolves to USD — keeping
  // the "Total amount" row consistent with the reused fee rows below.
  const formatFiat = usePayFiatFormatter();
  const totalFiat = transactionMeta.metamaskPay?.totalFiat;

  const handleViewOnExplorer = useCallback(() => {
    const { hash } = transactionMeta;
    if (!hash) {
      return;
    }
    const rpcBlockExplorer = findBlockExplorerUrlForChain(
      chainId,
      networkConfigurations,
    );
    const { url, title } = getBlockExplorerTxUrl(RPC, hash, rpcBlockExplorer);
    if (!url) {
      return;
    }
    trackBlockExplorerLinkClicked(trackEvent, createEventBuilder, {
      location: 'money_transaction_details',
      text: strings('transaction_details.view_on_block_explorer'),
      url,
    });
    onCloseSheet(() => {
      navigation.navigate(Routes.WEBVIEW.MAIN, {
        screen: Routes.WEBVIEW.SIMPLE,
        params: { url, title },
      });
    });
  }, [
    chainId,
    createEventBuilder,
    navigation,
    networkConfigurations,
    onCloseSheet,
    trackEvent,
    transactionMeta,
  ]);

  return (
    <ScrollView>
      <Box style={styles.container} gap={12}>
        {primaryAmount && tokenMeta ? (
          <Box testID="money-sent-hero" gap={8} style={styles.hero}>
            <Box gap={8}>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('transaction_details.label.you_sent')}
              </Text>
              <Box
                flexDirection={FlexDirection.Row}
                alignItems={AlignItems.center}
                gap={12}
              >
                <TokenIcon
                  chainId={chainId}
                  address={tokenMeta.contractAddress as Hex}
                  symbol={tokenMeta.symbol}
                  showNetwork={false}
                />
                <Text variant={TextVariant.HeadingLg}>{primaryAmount}</Text>
              </Box>
            </Box>
          </Box>
        ) : null}

        <TransactionDetailsRow label={strings('transactions.status')}>
          <TransactionDetailsStatus transactionMeta={transactionMeta} />
        </TransactionDetailsRow>
        <TransactionDetailsDateRow />

        {from ? (
          <TransactionDetailsRow
            label={strings('transaction_details.label.account')}
          >
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
                <AvatarAccount accountAddress={from} size={AvatarSize.Sm} />
              </BadgeWrapper>
              <Text>{accountName ?? formatAddress(from, 'short')}</Text>
            </Box>
          </TransactionDetailsRow>
        ) : null}

        {recipient ? (
          <TransactionDetailsRow
            label={strings('transaction_details.label.to')}
          >
            <Name
              type={NameType.EthereumAddress}
              value={recipient}
              variation={chainId}
            />
          </TransactionDetailsRow>
        ) : null}

        {networkName ? (
          <TransactionDetailsRow
            label={strings('transaction_details.label.network')}
          >
            <Box
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              gap={6}
            >
              <AvatarNetwork
                name={networkName}
                imageSource={networkImage}
                size={AvatarSize.Xs}
              />
              <Text>{networkName}</Text>
            </Box>
          </TransactionDetailsRow>
        ) : null}

        <TransactionDetailsPaidWithRow />

        <TransactionDetailDivider />

        <TransactionDetailsNetworkFeeRow />
        <TransactionDetailsBridgeFeeRow />

        {totalFiat ? (
          <TransactionDetailsRow
            label={strings('transaction_details.label.total_amount')}
          >
            <Text>{formatFiat(new BigNumber(totalFiat))}</Text>
          </TransactionDetailsRow>
        ) : null}

        {blockExplorerLinkEnabled && (
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            style={styles.button}
            label={strings('transaction_details.view_on_block_explorer')}
            onPress={handleViewOnExplorer}
          />
        )}
      </Box>
    </ScrollView>
  );
}
