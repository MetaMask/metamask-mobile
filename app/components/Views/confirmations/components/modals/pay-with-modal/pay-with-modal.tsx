import React, { useCallback, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Hex } from '@metamask/utils';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { strings } from '../../../../../../../locales/i18n';
import { Asset } from '../../send/asset';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import HeaderCenter from '../../../../../../component-library/components-temp/HeaderCenter';
import { AssetType } from '../../../types/token';
import { useTransactionPayRequiredTokens } from '../../../hooks/pay/useTransactionPayData';
import { getAvailableTokens } from '../../../utils/transaction-pay';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { TransactionType } from '@metamask/transaction-controller';
import { hasTransactionType } from '../../../utils/transaction';
import { useMusdConversionTokens } from '../../../../../UI/Earn/hooks/useMusdConversionTokens';
import { HIDE_NETWORK_FILTER_TYPES } from '../../../constants/confirmations';
import { useMusdPaymentToken } from '../../../../../UI/Earn/hooks/useMusdPaymentToken';
import Engine from '../../../../../../core/Engine';
import EngineService from '../../../../../../core/EngineService';
import type { FiatPaymentData } from '@metamask/transaction-pay-controller';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import { useTransactionPayFiat } from '../../../hooks/pay/useTransactionPayFiat';

export function PayWithModal() {
  const transactionMeta = useTransactionMetadataRequest();
  const hideNetworkFilter = hasTransactionType(
    transactionMeta,
    HIDE_NETWORK_FILTER_TYPES,
  );
  const { payToken, setPayToken } = useTransactionPayToken();
  const requiredTokens = useTransactionPayRequiredTokens();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const { filterAllowedTokens: musdTokenFilter } = useMusdConversionTokens();
  const { onPaymentTokenChange: onMusdPaymentTokenChange } =
    useMusdPaymentToken();
  const { isFiatPaymentEnabled } = useTransactionPayFiat();

  const close = useCallback((onClosed?: () => void) => {
    // Called after the bottom sheet's closing animation completes.
    bottomSheetRef.current?.onCloseBottomSheet(onClosed);
  }, []);

  const handleTokenSelect = useCallback(
    (token: AssetType) => {
      if (
        hasTransactionType(transactionMeta, [TransactionType.musdConversion])
      ) {
        close(() => onMusdPaymentTokenChange(token));
        return;
      }

      close(() => {
        setPayToken({
          address: token.address as Hex,
          chainId: token.chainId as Hex,
        });
      });
    },
    [close, onMusdPaymentTokenChange, setPayToken, transactionMeta],
  );

  const tokenFilter = useCallback(
    (tokens: AssetType[]) => {
      const availableTokens = getAvailableTokens({
        payToken,
        requiredTokens,
        tokens,
      });

      if (
        hasTransactionType(transactionMeta, [TransactionType.musdConversion])
      ) {
        return musdTokenFilter(availableTokens);
      }

      return availableTokens;
    },
    [musdTokenFilter, payToken, requiredTokens, transactionMeta],
  );

  return (
    <BottomSheet
      isFullscreen
      ref={bottomSheetRef}
      keyboardAvoidingViewEnabled={false}
    >
      {!isFiatPaymentEnabled && (
        <HeaderCenter
          title={strings('pay_with_modal.title')}
          // HeaderCenter close handler receives a press event; we must ignore it so it
          // isn't forwarded to `onCloseBottomSheet` as the post-close callback.
          onClose={() => close()}
        />
      )}
      <PayWithFiatSection close={close} />
      <Asset
        includeNoBalance
        hideNfts
        tokenFilter={tokenFilter}
        onTokenSelect={handleTokenSelect}
        hideNetworkFilter={hideNetworkFilter}
      />
    </BottomSheet>
  );
}

const POC_PROVIDERS = [
  {
    name: 'Debit Card',
    icon: IconName.Card,
    estimatedTime: 'Instant',
    fiatPaymentDetails: {
      providerId: 'transak',
      methodName: 'Debit Card',
      method: 'credit_debit_card',
    },
  },
  {
    name: 'Apple Pay',
    icon: IconName.Apple,
    estimatedTime: 'Instant',
    fiatPaymentDetails: {
      providerId: 'transak',
      methodName: 'Apple Pay',
      method: 'apple_pay',
    },
  },
];

const fiatStyles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
  },
  payWithCashTitle: {
    marginLeft: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  payWithCryptoTitle: {
    marginBottom: 8,
    marginLeft: 16,
    marginTop: 12,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  providerText: {
    flex: 1,
    marginLeft: 4,
  },
  estimatedTimeText: {},
});

function PayWithFiatSection({
  close,
}: {
  close: (callback?: () => void) => void;
}) {
  const transactionMeta = useTransactionMetadataRequest();
  const { isFiatPaymentEnabled } = useTransactionPayFiat();

  const handleFiatSelect = useCallback(
    (fiatPaymentDetails: FiatPaymentData) => {
      const transactionId = transactionMeta?.id;
      if (!transactionId) return;

      close(() => {
        Engine.context.TransactionPayController.setFiatPayment(
          transactionId,
          fiatPaymentDetails,
        );
        EngineService.flushState();
      });
    },
    [close, transactionMeta?.id],
  );

  if (!isFiatPaymentEnabled) {
    return null;
  }

  return (
    <>
      <Text
        variant={TextVariant.BodyMDBold}
        style={fiatStyles.payWithCashTitle}
      >
        Pay with cash
      </Text>
      <View style={fiatStyles.section}>
        {POC_PROVIDERS.map((provider) => (
          <TouchableOpacity
            key={provider.name}
            style={fiatStyles.providerRow}
            onPress={() => handleFiatSelect(provider.fiatPaymentDetails)}
          >
            <Icon name={provider.icon} size={IconSize.Md} />
            <Text variant={TextVariant.BodyMD} style={fiatStyles.providerText}>
              {provider.name}
            </Text>
            <Text
              variant={TextVariant.BodySM}
              style={fiatStyles.estimatedTimeText}
            >
              {provider.estimatedTime}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text
        variant={TextVariant.BodyMDBold}
        style={fiatStyles.payWithCryptoTitle}
      >
        Pay with crypto
      </Text>
    </>
  );
}
