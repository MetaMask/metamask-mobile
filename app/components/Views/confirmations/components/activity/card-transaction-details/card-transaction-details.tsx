import React, { useCallback, useEffect, useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useSelector } from 'react-redux';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import BigNumber from 'bignumber.js';
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
import type { CardTransaction } from '../../../../../UI/Money/types/moneyActivity';
import styleSheet from '../transaction-details/transaction-details.styles';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';

type CardDetailsRoute = RouteProp<
  { params?: { card?: CardTransaction } },
  'params'
>;

export function CardTransactionDetails() {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const card = useRoute<CardDetailsRoute>().params?.card;

  useEffect(() => {
    if (!card) {
      navigation.goBack();
    }
  }, [card, navigation]);

  if (!card) {
    return null;
  }

  return <CardTransactionDetailsContent card={card} />;
}

function CardTransactionDetailsContent({ card }: { card: CardTransaction }) {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const { networkName, networkImage } = useNetworkInfo(card.chainId);

  const spentAmount = useMemo(() => {
    const raw = new BigNumber(card.amount).dividedBy(
      new BigNumber(10).pow(card.token.decimals),
    );
    return raw.toFixed(2);
  }, [card.amount, card.token.decimals]);

  const formattedDate = useMemo(() => {
    const date = new Date(card.time);
    const month = getIntlDateTimeFormatter(I18n.locale, {
      month: 'short',
    }).format(date);
    const timeString = getIntlDateTimeFormatter(I18n.locale, {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date);
    return `${month} ${date.getDate()}, ${date.getFullYear()} at ${timeString}`;
  }, [card.time]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleViewOnExplorer = useCallback(() => {
    const rpcBlockExplorer = findBlockExplorerUrlForChain(
      card.chainId,
      networkConfigurations,
    );
    const { url, title } = getBlockExplorerTxUrl(
      RPC,
      card.hash,
      rpcBlockExplorer,
    );
    if (!url) {
      return;
    }
    navigation.navigate(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: { url, title },
    });
  }, [card.chainId, card.hash, navigation, networkConfigurations]);

  return (
    <View style={styles.wrapper}>
      <HeaderStandard
        title={strings('money.card_details.title')}
        onBack={handleBack}
        backButtonProps={{ testID: 'card-transaction-details-back-button' }}
        includesTopInset
      />
      <ScrollView>
        <Box style={styles.container} gap={12}>
          {/* Hero: "You spent" */}
          <Box gap={4}>
            <Text color={TextColor.Alternative}>
              {strings('money.card_details.you_spent')}
            </Text>
            <Box
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              gap={12}
            >
              <TokenIcon
                chainId={card.chainId}
                address={card.token.address}
                symbol={card.token.symbol}
                variant={TokenIconVariant.Hero}
              />
              <Text variant={TextVariant.DisplayMD}>
                -{spentAmount} {card.token.symbol}
              </Text>
            </Box>
          </Box>

          <TransactionDetailDivider />

          {/* Status */}
          <TransactionDetailsRow label={strings('transactions.status')}>
            <Text color={TextColor.Success}>
              {strings('money.card_details.completed')}
            </Text>
          </TransactionDetailsRow>

          {/* Date */}
          <TransactionDetailsRow label={strings('money.card_details.date')}>
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

          {/* Sent to */}
          <TransactionDetailsRow
            label={strings('transaction_details.label.to')}
          >
            <Box
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              gap={6}
            >
              <AvatarAccount accountAddress={'0x0'} size={AvatarSize.Sm} />
              <Text>{strings('transaction_details.label.money_account')}</Text>
            </Box>
          </TransactionDetailsRow>

          {/* View on block explorer */}
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('transaction_details.view_on_block_explorer')}
            onPress={handleViewOnExplorer}
            startIconName={IconName.Export}
            testID="card-transaction-details-explorer-button"
          />
        </Box>
      </ScrollView>
    </View>
  );
}
