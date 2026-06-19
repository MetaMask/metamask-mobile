import React, { useCallback, useMemo, useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { useSelector } from 'react-redux';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { HeaderStandard } from '@metamask/design-system-react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import AvatarAccount from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import AvatarNetwork from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';
import { Box } from '../../../../../UI/Box/Box';
import { AlignItems, FlexDirection } from '../../../../../UI/Box/box.types';
import { useStyles } from '../../../../../hooks/useStyles';
import { selectNetworkConfigurations } from '../../../../../../selectors/networkController';
import { selectPrimaryMoneyAccount } from '../../../../../../selectors/moneyAccountController';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../../selectors/currencyRateController';
import {
  findBlockExplorerUrlForChain,
  getBlockExplorerTxUrl,
} from '../../../../../../util/networks';
import { getIntlDateTimeFormatter } from '../../../../../../util/intl';
import { RPC } from '../../../../../../constants/network';
import Routes from '../../../../../../constants/navigation/Routes';
import I18n, { strings } from '../../../../../../../locales/i18n';
import { TransactionDetailDivider } from '../transaction-detail-divider/transaction-detail-divider';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import { TokenIcon, TokenIconVariant } from '../../token-icon';
import useNetworkInfo from '../../../hooks/useNetworkInfo';
import Name from '../../../../../UI/Name/Name';
import { NameType } from '../../../../../UI/Name/Name.types';
import type { AccountsApiActivity } from '../../../../../UI/Money/types/moneyActivity';
import { accountsApiActivityDisplayInfo } from '../../../../../UI/Money/utils/accountsApiActivityDisplayInfo';
import { getUsdToFiatConversionRate } from '../../../../../UI/Money/utils/moneyActivityFiat';
import { selectMoneyEnableActivityDetailsBlockexplorerLinkFlag } from '../../../../../UI/Money/selectors/featureFlags';
import styleSheet from '../transaction-details/transaction-details.styles';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';

/**
 * Full-screen details for an Accounts-API activity (a card spend or musdback).
 *
 * These settle on-chain and surface from the MetaMask Accounts API rather than
 * the local `TransactionController`, so they share one detail surface that
 * branches its copy on `activity.kind`.
 */
type ActivityDetailsRoute = RouteProp<
  { params?: { activity?: AccountsApiActivity } },
  'params'
>;

export function CardTransactionDetails() {
  const navigation = useNavigation();
  const activity = useRoute<ActivityDetailsRoute>().params?.activity;

  useEffect(() => {
    if (!activity) {
      navigation.goBack();
    }
  }, [activity, navigation]);

  if (!activity) {
    return null;
  }

  return <CardTransactionDetailsContent activity={activity} />;
}

function CardTransactionDetailsContent({
  activity,
}: {
  activity: AccountsApiActivity;
}) {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const currencyRates = useSelector(selectCurrencyRates);
  const blockExplorerLinkEnabled = useSelector(
    selectMoneyEnableActivityDetailsBlockexplorerLinkFlag,
  );
  const { networkName, networkImage } = useNetworkInfo(activity.chainId);

  const isCard = activity.kind === 'card';

  const display = useMemo(
    () =>
      accountsApiActivityDisplayInfo(activity, {
        currentCurrency,
        usdToCurrentCurrencyRate: getUsdToFiatConversionRate(currencyRates),
      }),
    [activity, currentCurrency, currencyRates],
  );

  const formattedDate = useMemo(() => {
    const date = new Date(activity.time);
    const month = getIntlDateTimeFormatter(I18n.locale, {
      month: 'short',
    }).format(date);
    const timeString = getIntlDateTimeFormatter(I18n.locale, {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date);
    return `${month} ${date.getDate()}, ${date.getFullYear()} at ${timeString}`;
  }, [activity.time]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleViewOnExplorer = useCallback(() => {
    const rpcBlockExplorer = findBlockExplorerUrlForChain(
      activity.chainId,
      networkConfigurations,
    );
    const { url, title } = getBlockExplorerTxUrl(
      RPC,
      activity.hash,
      rpcBlockExplorer,
    );
    if (!url) {
      return;
    }
    navigation.navigate(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: { url, title },
    });
  }, [activity.chainId, activity.hash, navigation, networkConfigurations]);

  return (
    <View style={styles.wrapper}>
      <HeaderStandard
        title={strings(
          isCard
            ? 'money.api_activity_details.card_title'
            : 'money.api_activity_details.cashback_title',
        )}
        onBack={handleBack}
        backButtonProps={{ testID: 'card-transaction-details-back-button' }}
        includesTopInset
      />
      <ScrollView>
        <Box style={styles.container} gap={12}>
          {/* Hero: "You spent" / "You earned" */}
          <Box gap={4}>
            <Text color={TextColor.Alternative}>
              {strings(
                isCard
                  ? 'money.api_activity_details.you_spent'
                  : 'money.api_activity_details.you_earned',
              )}
            </Text>
            <Box
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              gap={12}
            >
              <TokenIcon
                chainId={activity.chainId}
                address={activity.token.address}
                symbol={activity.token.symbol}
                variant={TokenIconVariant.Hero}
              />
              <Text
                variant={TextVariant.DisplayMD}
                color={
                  display.isIncoming ? TextColor.Success : TextColor.Default
                }
              >
                {display.primaryAmount}
              </Text>
            </Box>
          </Box>

          <TransactionDetailDivider />

          {/* Accounts-API activity is an on-chain settlement — it only surfaces
              after confirmation, so status is always "Completed". */}
          <TransactionDetailsRow label={strings('transactions.status')}>
            <Text color={TextColor.Success}>
              {strings('money.api_activity_details.completed')}
            </Text>
          </TransactionDetailsRow>

          {/* Date */}
          <TransactionDetailsRow
            label={strings('money.api_activity_details.date')}
          >
            <Text>{formattedDate}</Text>
          </TransactionDetailsRow>

          {/* Network */}
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

          {/* Counterparty. Card spends are framed as leaving the money account
              ("To: Money account"); musdback shows the actual sender. */}
          {isCard ? (
            <TransactionDetailsRow
              label={strings('transaction_details.label.to')}
            >
              <Box
                flexDirection={FlexDirection.Row}
                alignItems={AlignItems.center}
                gap={6}
              >
                <AvatarAccount
                  accountAddress={
                    primaryMoneyAccount?.address ?? activity.paidTo
                  }
                  size={AvatarSize.Sm}
                />
                <Text>
                  {strings('transaction_details.label.money_account')}
                </Text>
              </Box>
            </TransactionDetailsRow>
          ) : (
            <TransactionDetailsRow
              label={strings('money.api_activity_details.received_from')}
            >
              <Name
                type={NameType.EthereumAddress}
                value={activity.receivedFrom}
                variation={activity.chainId}
              />
            </TransactionDetailsRow>
          )}

          {/* View on block explorer */}
          {blockExplorerLinkEnabled && (
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              label={strings('transaction_details.view_on_block_explorer')}
              onPress={handleViewOnExplorer}
              startIconName={IconName.Export}
              testID="card-transaction-details-explorer-button"
            />
          )}
        </Box>
      </ScrollView>
    </View>
  );
}
