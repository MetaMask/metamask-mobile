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
import { cashbackTransactionDisplayInfo } from '../../utils/cashbackTransactionDisplayInfo';
import { getUsdToFiatConversionRate } from '../../utils/moneyActivityFiat';
import type { CashbackTransaction } from '../../types/moneyActivity';
import { MoneyCashbackTransactionDetailsSheetTestIds } from './MoneyCashbackTransactionDetailsSheet.testIds';

type CashbackDetailsRoute = RouteProp<
  { params?: { cashback?: CashbackTransaction } },
  'params'
>;

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingVertical: 12 },
});

const CashbackTransactionDetails = ({
  cashback,
}: {
  cashback: CashbackTransaction;
}) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const surfaceClass = useElevatedSurface();

  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const currencyRates = useSelector(selectCurrencyRates);
  const { networkName, networkImage } = useNetworkInfo(cashback.chainId);

  const display = useMemo(
    () =>
      cashbackTransactionDisplayInfo(cashback, {
        currentCurrency,
        usdToCurrentCurrencyRate: getUsdToFiatConversionRate(currencyRates),
      }),
    [cashback, currentCurrency, currencyRates],
  );

  const formattedDate = useMemo(
    () =>
      new Date(cashback.time).toLocaleString(I18n.locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [cashback.time],
  );

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleViewOnExplorer = useCallback(() => {
    const rpcBlockExplorer = findBlockExplorerUrlForChain(
      cashback.chainId,
      networkConfigurations,
    );
    const { url, title } = getBlockExplorerTxUrl(
      RPC,
      cashback.hash,
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
  }, [cashback.chainId, cashback.hash, navigation, networkConfigurations]);

  return (
    <BottomSheet
      ref={sheetRef}
      isFullscreen
      goBack={navigation.goBack}
      keyboardAvoidingViewEnabled={false}
      twClassName={surfaceClass}
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMd}>
          {strings('money.cashback_details.title')}
        </Text>
      </BottomSheetHeader>
      <ScrollView
        testID={MoneyCashbackTransactionDetailsSheetTestIds.CONTAINER}
      >
        <Box style={styles.content} gap={12}>
          <Box gap={8}>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('money.cashback_details.you_earned')}
            </Text>
            <Box
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              gap={12}
            >
              <TokenIcon
                chainId={cashback.chainId}
                address={cashback.token.address}
                symbol={cashback.token.symbol}
                variant={TokenIconVariant.Hero}
                showNetwork={false}
              />
              <Text
                variant={TextVariant.HeadingLg}
                color={TextColor.SuccessDefault}
                testID={MoneyCashbackTransactionDetailsSheetTestIds.AMOUNT}
              >
                {display.primaryAmount}
              </Text>
            </Box>
          </Box>

          <TransactionDetailsRow label={strings('transactions.status')}>
            <Text color={TextColor.SuccessDefault}>
              {strings('money.cashback_details.completed')}
            </Text>
          </TransactionDetailsRow>

          <TransactionDetailsRow label={strings('money.cashback_details.date')}>
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

          <TransactionDetailsRow
            label={strings('money.cashback_details.received_from')}
          >
            <Name
              type={NameType.EthereumAddress}
              value={cashback.from}
              variation={cashback.chainId as Hex}
            />
          </TransactionDetailsRow>

          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('transaction_details.view_on_block_explorer')}
            onPress={handleViewOnExplorer}
            testID={MoneyCashbackTransactionDetailsSheetTestIds.EXPLORER_BUTTON}
          />
        </Box>
      </ScrollView>
    </BottomSheet>
  );
};

/**
 * Route entry for the cashback detail sheet. Guards against being reached
 * without its `cashback` param (e.g. navigation-state restoration) — the
 * cashback object is the sheet's only data source — by popping back rather than
 * rendering a broken sheet.
 */
const MoneyCashbackTransactionDetailsSheet = () => {
  const navigation = useNavigation();
  const cashback = useRoute<CashbackDetailsRoute>().params?.cashback;

  useEffect(() => {
    if (!cashback) {
      navigation.goBack();
    }
  }, [cashback, navigation]);

  if (!cashback) {
    return null;
  }

  return <CashbackTransactionDetails cashback={cashback} />;
};

export default MoneyCashbackTransactionDetailsSheet;
