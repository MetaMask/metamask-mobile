import React, { useCallback, useRef } from 'react';
import { StyleSheet } from 'react-native';
import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import { MONEY_AUTHENTICATOR_TOTP_URI } from '../../constants/moneyAuthenticator';
import Routes from '../../../../../constants/navigation/Routes';
import type { MoneyNavigationParamList } from '../../types/navigation';
import { MoneyAuthenticatorKeySheetTestIds } from './MoneyAuthenticatorKeySheet.testIds';

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  qrCode: {
    width: 160,
    height: 160,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const MoneyAuthenticatorKeySheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<
      RouteProp<MoneyNavigationParamList, 'MoneyAuthenticatorKeySheet'>
    >();

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleScanned = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      navigation.navigate(Routes.MONEY.AUTHENTICATOR, {
        entryPoint: route.params.entryPoint,
        initialStep: 'verify',
      });
    });
  }, [navigation, route.params.entryPoint]);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={() => navigation.goBack()}
      keyboardAvoidingViewEnabled={false}
      testID={MoneyAuthenticatorKeySheetTestIds.CONTAINER}
    >
      <BottomSheetHeader onClose={closeSheet}>
        {strings('money.authenticator.qr_code_title')}
      </BottomSheetHeader>
      <Box style={styles.content}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('money.authenticator.qr_code_description')}
        </Text>
        <Box twClassName="items-center mt-5 mb-6">
          <Box style={styles.qrCode} twClassName="bg-white">
            <QRCode
              value={MONEY_AUTHENTICATOR_TOTP_URI}
              size={144}
              testID={MoneyAuthenticatorKeySheetTestIds.QR_CODE}
            />
          </Box>
        </Box>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleScanned}
          testID={MoneyAuthenticatorKeySheetTestIds.SCANNED_BUTTON}
        >
          {strings('money.authenticator.qr_code_scanned')}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default MoneyAuthenticatorKeySheet;
