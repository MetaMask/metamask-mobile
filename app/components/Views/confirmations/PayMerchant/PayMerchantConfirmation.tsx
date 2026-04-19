import React, { useCallback, useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import {
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonVariant,
  ButtonSize,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { parsePaymentUri } from '../../../../util/payment-request';
import type { ParsedPaymentUri } from '../../../../util/payment-request';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';
import { fromTokenMinimalUnitString } from '../../../../util/number';
import { useAccountTokens } from '../hooks/send/useAccountTokens';
import { submitEvmTransaction } from '../utils/send';
import { ConfirmationLoader } from '../components/confirm/confirm-component';
import InfoRow from '../components/UI/info-row';
import InfoSection from '../components/UI/info-row/info-section';
import type { AssetType } from '../types/token';
import { PayMerchantConfirmationTestIds } from './PayMerchantConfirmation.testIds';

export interface PayMerchantConfirmationParams {
  uri: string;
  origin?: string;
}

interface RootNavigationParamList extends ParamListBase {
  PayMerchantConfirmation: PayMerchantConfirmationParams;
}

function shortAddress(address: string): string {
  if (address.length <= 10) {
    return address;
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function chainIdDecimalToHex(chainIdDecimal: string): Hex | null {
  const n = Number.parseInt(chainIdDecimal, 10);
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return `0x${n.toString(16)}` as Hex;
}

interface ParsedState {
  parsed: ParsedPaymentUri | null;
  error: string | null;
}

function safeParse(uri: string): ParsedState {
  try {
    return { parsed: parsePaymentUri(uri), error: null };
  } catch (e) {
    return {
      parsed: null,
      error: e instanceof Error ? e.message : 'Invalid payment URI',
    };
  }
}

const PayMerchantConfirmation = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<RootNavigationParamList, 'PayMerchantConfirmation'>>();
  const { uri } = route.params ?? { uri: '' };

  const { parsed, error } = useMemo(() => safeParse(uri), [uri]);

  const fromAddress = useSelector(selectSelectedInternalAccountAddress);
  const networkConfigs = useSelector(selectEvmNetworkConfigurationsByChainId);
  const accountTokens = useAccountTokens({ includeNoBalance: true });

  const chainIdHex = useMemo<Hex | null>(
    () => (parsed ? chainIdDecimalToHex(parsed.chainId) : null),
    [parsed],
  );

  const asset = useMemo<AssetType | null>(() => {
    if (!parsed || !chainIdHex) {
      return null;
    }
    const target = parsed.asset;
    return (
      accountTokens.find((t) => {
        if (t.chainId?.toLowerCase() !== chainIdHex.toLowerCase()) {
          return false;
        }
        if (target.type === 'native') {
          return t.isNative === true || t.isETH === true;
        }
        return (
          (t.address ?? '').toLowerCase() === target.address.toLowerCase()
        );
      }) ?? null
    );
  }, [accountTokens, chainIdHex, parsed]);

  const amountHuman = useMemo<string | null>(() => {
    if (!parsed || !asset) {
      return null;
    }
    try {
      return fromTokenMinimalUnitString(parsed.amount, asset.decimals);
    } catch {
      return null;
    }
  }, [parsed, asset]);

  const networkName = useMemo<string | null>(() => {
    if (!chainIdHex) return null;
    return networkConfigs?.[chainIdHex]?.name ?? null;
  }, [networkConfigs, chainIdHex]);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const canConfirm = Boolean(
    parsed && chainIdHex && asset && amountHuman && fromAddress,
  );

  const handleConfirm = useCallback(() => {
    if (!parsed || !chainIdHex || !asset || !amountHuman || !fromAddress) {
      return;
    }
    // Submits tx via TransactionController (creates the approval request) and
    // routes straight into the standard final confirmation where the user
    // signs — no intermediate Send screens needed since every param is already
    // known from the merchant URI.
    submitEvmTransaction({
      asset,
      chainId: chainIdHex,
      from: fromAddress as Hex,
      to: parsed.merchantAddress as Hex,
      value: amountHuman,
    });

    navigation.navigate(Routes.SEND.DEFAULT, {
      screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      params: { loader: ConfirmationLoader.Transfer },
    });
  }, [
    parsed,
    chainIdHex,
    asset,
    amountHuman,
    fromAddress,
    navigation,
  ]);

  if (error || !parsed) {
    return (
      <ScrollView
        testID={PayMerchantConfirmationTestIds.SCREEN}
        contentContainerStyle={tw.style('p-4')}
      >
        <Text variant={TextVariant.HeadingLg}>
          {strings('pay_merchant.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.ErrorDefault}
          twClassName="mt-4"
          testID={PayMerchantConfirmationTestIds.ERROR}
        >
          {error ?? 'Unknown error'}
        </Text>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleCancel}
          testID={PayMerchantConfirmationTestIds.CANCEL_BUTTON}
          style={tw.style('mt-6')}
        >
          {strings('pay_merchant.cancel')}
        </Button>
      </ScrollView>
    );
  }

  const merchantLabel = parsed.metadata.merchantName
    ? parsed.metadata.merchantName
    : shortAddress(parsed.merchantAddress);

  const amountText =
    amountHuman && asset?.symbol
      ? `${amountHuman} ${asset.symbol}`
      : amountHuman ?? '—';

  return (
    <ScrollView
      testID={PayMerchantConfirmationTestIds.SCREEN}
      contentContainerStyle={tw.style('pb-8')}
    >
      <Box twClassName="px-4 pt-4 pb-3 gap-1">
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
        >
          {strings('pay_merchant.title')}
        </Text>
        <Text
          variant={TextVariant.HeadingLg}
          fontWeight={FontWeight.Bold}
          testID={PayMerchantConfirmationTestIds.HEADER}
        >
          {merchantLabel}
        </Text>
      </Box>

      <View>
        <InfoSection>
          <InfoRow label={strings('pay_merchant.amount_label')}>
            <Text
              variant={TextVariant.BodyMd}
              testID={PayMerchantConfirmationTestIds.AMOUNT}
            >
              {amountText}
            </Text>
          </InfoRow>
          {networkName ? (
            <InfoRow label={strings('pay_merchant.network_label')}>
              {networkName}
            </InfoRow>
          ) : null}
          <InfoRow
            label={strings('pay_merchant.recipient_label')}
            copyText={parsed.merchantAddress}
          >
            <Text
              variant={TextVariant.BodyMd}
              testID={PayMerchantConfirmationTestIds.ADDRESS}
            >
              {shortAddress(parsed.merchantAddress)}
            </Text>
          </InfoRow>
        </InfoSection>

        {parsed.metadata.memo || parsed.metadata.invoiceId ? (
          <InfoSection>
            {parsed.metadata.memo ? (
              <InfoRow label={strings('pay_merchant.memo_label')}>
                <Text
                  variant={TextVariant.BodyMd}
                  testID={PayMerchantConfirmationTestIds.MEMO}
                >
                  {parsed.metadata.memo}
                </Text>
              </InfoRow>
            ) : null}
            {parsed.metadata.invoiceId ? (
              <InfoRow label={strings('pay_merchant.invoice_id_label')}>
                <Text
                  variant={TextVariant.BodyMd}
                  testID={PayMerchantConfirmationTestIds.INVOICE_ID}
                >
                  {parsed.metadata.invoiceId}
                </Text>
              </InfoRow>
            ) : null}
          </InfoSection>
        ) : null}

        {!asset ? (
          <Box twClassName="px-4 py-2">
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.ErrorDefault}
            >
              {strings('pay_merchant.asset_not_supported')}
            </Text>
          </Box>
        ) : null}
      </View>

      <Box
        flexDirection={BoxFlexDirection.Column}
        twClassName="px-4 mt-6 gap-3"
      >
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleConfirm}
          isDisabled={!canConfirm}
          testID={PayMerchantConfirmationTestIds.CONFIRM_BUTTON}
        >
          {strings('pay_merchant.confirm')}
        </Button>
        <Button
          variant={ButtonVariant.Tertiary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleCancel}
          testID={PayMerchantConfirmationTestIds.CANCEL_BUTTON}
        >
          {strings('pay_merchant.cancel')}
        </Button>
      </Box>
    </ScrollView>
  );
};

export default PayMerchantConfirmation;
