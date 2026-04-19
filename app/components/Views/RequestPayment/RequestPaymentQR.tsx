import React, { useCallback, useMemo } from 'react';
import { Share, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import QRCode from 'react-native-qrcode-svg';
import {
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonVariant,
  ButtonSize,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { selectSelectedInternalAccountAddress } from '../../../selectors/accountsController';
import {
  buildPaymentUri,
  toAtomicAmount,
} from '../../../util/payment-request';
import { AssetType } from '../confirmations/types/token';
import { RequestPaymentTestIds } from './RequestPayment.testIds';

// Prefilled demo metadata — for the MVP we don't collect this in the UI.
const DEMO_METADATA = {
  merchantName: 'Coffee House',
  memo: 'Coffee',
};

export interface RequestPaymentQRParams {
  asset: AssetType;
  amount: string;
}

interface RequestPaymentParamList extends ParamListBase {
  RequestPaymentQR: RequestPaymentQRParams;
}

const RequestPaymentQR = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<RequestPaymentParamList, 'RequestPaymentQR'>>();
  const { asset, amount } = route.params;
  const merchantAddress = useSelector(selectSelectedInternalAccountAddress);

  const uri = useMemo(() => {
    if (!merchantAddress) return '';
    const atomic = toAtomicAmount(amount, asset.decimals);
    const chainIdDecimal = Number.parseInt(
      (asset.chainId ?? '0x1').toString(),
      16,
    ).toString();
    return buildPaymentUri({
      chainId: chainIdDecimal,
      merchantAddress,
      amount: atomic,
      asset: asset.isNative
        ? { type: 'native' }
        : { type: 'erc20', address: asset.address },
      metadata: {
        ...DEMO_METADATA,
        invoiceId: `DEMO-${Date.now()}`,
        issuedAt: new Date().toISOString(),
      },
    });
  }, [amount, asset, merchantAddress]);

  const handleShare = useCallback(() => {
    Share.share({ message: uri }).catch(() => {
      // Ignore share errors — user dismissed the sheet.
    });
  }, [uri]);

  const handleCopy = useCallback(() => {
    Clipboard.setString(uri);
  }, [uri]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleDone = useCallback(() => {
    // Exit the nested RequestPayment stack and land on the activity list so
    // the merchant can watch for the incoming transfer.
    navigation.getParent()?.navigate(Routes.TRANSACTIONS_VIEW);
  }, [navigation]);

  return (
    <View
      testID={RequestPaymentTestIds.QR_SCREEN}
      style={tw.style('flex-1 p-4 bg-default')}
    >
      <Text variant={TextVariant.HeadingLg}>
        {strings('request_payment.qr_step_title')}
      </Text>
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {strings('request_payment.qr_step_subtitle')}
      </Text>

      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        twClassName="mt-6"
      >
        <Box
          twClassName="p-6 border border-muted rounded-2xl bg-white"
          testID={RequestPaymentTestIds.QR_CODE}
        >
          <QRCode value={uri || 'ethereum:0x0'} size={240} />
        </Box>
      </Box>

      <Text
        variant={TextVariant.BodyMd}
        twClassName="mt-4 text-center"
      >
        {amount} {asset.ticker ?? asset.symbol}
      </Text>

      <Box flexDirection={BoxFlexDirection.Column} twClassName="mt-6 gap-3">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleDone}
        >
          {strings('request_payment.done')}
        </Button>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleShare}
        >
          {strings('request_payment.share')}
        </Button>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleCopy}
        >
          {strings('request_payment.copy_uri')}
        </Button>
        <Button
          variant={ButtonVariant.Tertiary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleBack}
        >
          {strings('request_payment.back')}
        </Button>
      </Box>
    </View>
  );
};

export default RequestPaymentQR;
