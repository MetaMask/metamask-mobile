import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { type Hex } from '@metamask/utils';
import {
  BottomSheet,
  BottomSheetHeader,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import I18n, { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { RPC } from '../../../../../constants/network';
import {
  findBlockExplorerUrlForChain,
  getBlockExplorerTxUrl,
} from '../../../../../util/networks';
import { useElevatedSurface } from '../../../../../util/theme/themeUtils';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import AvatarNetwork from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';
import { Box } from '../../../Box/Box';
import { AlignItems, FlexDirection } from '../../../Box/box.types';
import Name from '../../../Name/Name';
import { NameType } from '../../../Name/Name.types';
import { TransactionDetailsRow } from '../../../../Views/confirmations/components/activity/transaction-details-row/transaction-details-row';
import {
  TokenIcon,
  TokenIconVariant,
} from '../../../../Views/confirmations/components/token-icon';
import useNetworkInfo from '../../../../Views/confirmations/hooks/useNetworkInfo';
import { accountsApiActivityDisplayInfo } from '../../utils/accountsApiActivityDisplayInfo';
import { selectMoneyEnableActivityDetailsBlockexplorerLinkFlag } from '../../selectors/featureFlags';
import { getUsdToFiatConversionRate } from '../../utils/moneyActivityFiat';
import type { AccountsApiActivity } from '../../types/moneyActivity';
import { MoneyApiActivityDetailsSheetTestIds } from './MoneyApiActivityDetailsSheet.testIds';

type ApiActivityDetailsRoute = RouteProp<
  { params?: { activity?: AccountsApiActivity } },
  'params'
>;

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingVertical: 12 },
});

function detailsCopy(activity: AccountsApiActivity): {
  title: string;
  amountLabel: string;
  counterpartyLabel: string;
  counterparty: Hex;
} {
  if (activity.kind === 'cashback') {
    return {
      title: strings('money.api_activity_details.cashback_title'),
      amountLabel: strings('money.api_activity_details.you_earned'),
      counterpartyLabel: strings('money.api_activity_details.received_from'),
      counterparty: activity.receivedFrom,
    };
  }
  return {
    title: strings('money.api_activity_details.card_title'),
    amountLabel: strings('money.api_activity_details.you_spent'),
    counterpartyLabel: strings('money.api_activity_details.paid_to'),
    counterparty: activity.paidTo,
  };
}

const ApiActivityDetails = ({
  activity,
}: {
  activity: AccountsApiActivity;
}) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const surfaceClass = useElevatedSurface();

  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const currencyRates = useSelector(selectCurrencyRates);
  const blockExplorerLinkEnabled = useSelector(
    selectMoneyEnableActivityDetailsBlockexplorerLinkFlag,
  );
  const { networkName, networkImage } = useNetworkInfo(activity.chainId);

  const display = useMemo(
    () =>
      accountsApiActivityDisplayInfo(activity, {
        currentCurrency,
        usdToCurrentCurrencyRate: getUsdToFiatConversionRate(currencyRates),
      }),
    [activity, currentCurrency, currencyRates],
  );

  const copy = useMemo(() => detailsCopy(activity), [activity]);

  const formattedDate = useMemo(
    () =>
      new Date(activity.time).toLocaleString(I18n.locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [activity.time],
  );

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

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
    // Dismiss the sheet *before* navigating. This sheet is a `transparentModal`
    // presented over the main stack, and the WebView is a sibling screen on
    // that same stack. Navigating while the modal is still up pushes the
    // WebView behind it (so it never appears) and strands the sheet's overlay
    // on screen. Closing first pops the modal, then the callback pushes the
    // WebView onto the now-top stack.
    sheetRef.current?.onCloseBottomSheet(() => {
      navigation.navigate(Routes.WEBVIEW.MAIN, {
        screen: Routes.WEBVIEW.SIMPLE,
        params: { url, title },
      });
    });
  }, [activity.chainId, activity.hash, navigation, networkConfigurations]);

  return (
    <BottomSheet
      ref={sheetRef}
      isFullscreen
      goBack={navigation.goBack}
      keyboardAvoidingViewEnabled={false}
      twClassName={surfaceClass}
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMd}>{copy.title}</Text>
      </BottomSheetHeader>
      <ScrollView testID={MoneyApiActivityDetailsSheetTestIds.CONTAINER}>
        <Box style={styles.content} gap={12}>
          <Box gap={8}>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {copy.amountLabel}
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
                showNetwork={false}
              />
              <Text
                variant={TextVariant.HeadingLg}
                color={
                  display.isIncoming
                    ? TextColor.SuccessDefault
                    : TextColor.TextDefault
                }
                testID={MoneyApiActivityDetailsSheetTestIds.AMOUNT}
              >
                {display.primaryAmount}
              </Text>
            </Box>
          </Box>

          <TransactionDetailsRow label={strings('transactions.status')}>
            <Text color={TextColor.SuccessDefault}>
              {strings('money.api_activity_details.completed')}
            </Text>
          </TransactionDetailsRow>

          <TransactionDetailsRow
            label={strings('money.api_activity_details.date')}
          >
            <Text>{formattedDate}</Text>
          </TransactionDetailsRow>

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

          <TransactionDetailsRow label={copy.counterpartyLabel}>
            <Name
              type={NameType.EthereumAddress}
              value={copy.counterparty}
              variation={activity.chainId as Hex}
            />
          </TransactionDetailsRow>

          {blockExplorerLinkEnabled && (
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              label={strings('transaction_details.view_on_block_explorer')}
              onPress={handleViewOnExplorer}
              testID={MoneyApiActivityDetailsSheetTestIds.EXPLORER_BUTTON}
            />
          )}
        </Box>
      </ScrollView>
    </BottomSheet>
  );
};

/**
 * Route entry for the Accounts-API activity detail sheet (card spends and
 * musdback). Guards against being reached without its `activity` param (e.g.
 * navigation-state restoration) — the activity object is the sheet's only data
 * source — by popping back rather than rendering a broken sheet.
 */
const MoneyApiActivityDetailsSheet = () => {
  const navigation = useNavigation();
  const activity = useRoute<ApiActivityDetailsRoute>().params?.activity;

  useEffect(() => {
    if (!activity) {
      navigation.goBack();
    }
  }, [activity, navigation]);

  if (!activity) {
    return null;
  }

  return <ApiActivityDetails activity={activity} />;
};

export default MoneyApiActivityDetailsSheet;
