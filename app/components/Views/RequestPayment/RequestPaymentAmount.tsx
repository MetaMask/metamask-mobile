import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { AnimatedCursor } from '../confirmations/components/send/amount/animated-cursor';
import { EditAmountKeyboard } from '../confirmations/components/edit-amount-keyboard';
import { useStyles } from '../../hooks/useStyles';
import { AssetType } from '../confirmations/types/token';
import Device from '../../../util/device';
import { styleSheet } from './RequestPaymentAmount.styles';
import { RequestPaymentTestIds } from './RequestPayment.testIds';

export interface RequestPaymentAmountParams {
  asset: AssetType;
}

interface RequestPaymentParamList extends ParamListBase {
  RequestPaymentAmount: RequestPaymentAmountParams;
}

const RequestPaymentAmount = () => {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<RequestPaymentParamList, 'RequestPaymentAmount'>>();
  const { asset } = route.params;

  const [amount, setAmount] = useState('');

  const assetSymbol = asset.ticker ?? asset.symbol ?? '';
  const { styles } = useStyles(styleSheet, {
    contentLength: amount.length + assetSymbol.length,
  });
  const isIos = Device.isIos();

  const handlePercentagePress = useCallback(() => {
    // Percentages are not meaningful when requesting payment — ignored.
  }, []);

  const handleContinue = useCallback(() => {
    if (!amount) return;
    navigation.navigate(Routes.REQUEST_PAYMENT.QR, { asset, amount });
  }, [amount, asset, navigation]);

  const textColor = amount.length ? TextColor.Default : TextColor.Muted;
  const defaultValue = '0';

  return (
    <SafeAreaView
      edges={isIos ? ['left', 'right'] : ['left', 'right', 'bottom']}
      style={styles.container}
      testID={RequestPaymentTestIds.AMOUNT_SCREEN}
    >
      <View style={styles.topSection}>
        <View style={styles.inputSection}>
          <View style={styles.inputWrapper}>
            <Text
              color={textColor}
              style={styles.inputText}
              numberOfLines={1}
              variant={TextVariant.DisplayMD}
              adjustsFontSizeToFit
              testID={RequestPaymentTestIds.AMOUNT_VALUE}
            >
              {amount.length ? amount : defaultValue}
            </Text>
            <AnimatedCursor />
            <Text
              style={styles.inputText}
              color={TextColor.Muted}
              numberOfLines={1}
              variant={TextVariant.DisplayLG}
            >
              {assetSymbol}
            </Text>
          </View>
        </View>
      </View>
      <EditAmountKeyboard
        value={amount}
        onChange={setAmount}
        onPercentagePress={handlePercentagePress}
        showAdditionalKeyboard={false}
        enableEmptyValueString
        hideDoneButton
        additionalRow={
          amount.length > 0 ? (
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={handleContinue}
              style={styles.continueButton}
              testID={RequestPaymentTestIds.CONTINUE_BUTTON}
            >
              {strings('request_payment.next')}
            </Button>
          ) : undefined
        }
      />
    </SafeAreaView>
  );
};

export default RequestPaymentAmount;
