import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  Button,
  BoxBackgroundColor,
} from '@metamask/design-system-react-native';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';
import { useNavigation } from '@react-navigation/native';
import { DeviceEventEmitter, Image } from 'react-native';
import addDeviceToWalletImage from '../../../images/add_wallet_to_device.png';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog */
import {
  createQRScannerNavDetails,
  QRTabSwitcherScreens,
  type ScanSuccess,
} from '../QRTabSwitcher';
/* eslint-enable import-x/no-restricted-paths */
import DeviceAdded from './DeviceAdded';

/** Temporary mock OTP for bottom-sheet UI testing until QrSyncController is integrated. */
const ADD_DEVICE_MOCK_VERIFICATION_CODE = '469192';

const noopScanSuccess = (_data: ScanSuccess, _content?: string) => undefined;

const Points = ({
  number,
  children,
}: {
  number: number;
  children: React.ReactNode;
}) => (
  <Box twClassName="flex-row items-center gap-2">
    <Box
      backgroundColor={BoxBackgroundColor.BackgroundSection}
      twClassName="w-8 h-8 rounded-full items-center justify-center"
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
      >
        {number}
      </Text>
    </Box>
    <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
      {children}
    </Text>
  </Box>
);

const AddDeviceToWallet = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const [deviceAdded, setDeviceAdded] = useState(false);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      'addDeviceVerificationDone',
      () => setDeviceAdded(true),
    );
    return () => subscription.remove();
  }, []);

  const handleMwpDeeplinkScanned = useCallback(
    (_deeplink: string) => {
      navigation.goBack();
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.ADD_DEVICE_VERIFICATION_CODE,
        params: __DEV__
          ? { verificationCode: ADD_DEVICE_MOCK_VERIFICATION_CODE }
          : undefined,
      });
    },
    [navigation],
  );

  const openQRScanner = useCallback(() => {
    navigation.navigate(
      ...createQRScannerNavDetails({
        initialScreen: QRTabSwitcherScreens.Scanner,
        disableTabber: true,
        onScanSuccess: noopScanSuccess,
        onMwpDeeplinkScanned: handleMwpDeeplinkScanned,
        origin: Routes.ONBOARDING.ADD_DEVICE_TO_WALLET,
      }),
    );
  }, [navigation, handleMwpDeeplinkScanned]);

  if (deviceAdded) {
    return <DeviceAdded />;
  }

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')}>
      <HeaderCompactStandard onBack={() => navigation.goBack()} />
      <Box twClassName="flex-1 gap-5 px-4 py-4">
        <Image
          source={addDeviceToWalletImage}
          style={tw.style('w-[130px] h-[130px] mx-auto')}
        />

        <Text
          variant={TextVariant.HeadingLg}
          color={TextColor.TextDefault}
          fontWeight={FontWeight.Bold}
        >
          {strings('app_settings.add_device.add_device_to_wallet')}
        </Text>

        <Box twClassName="flex-col gap-4 mt-2">
          <Points number={1}>
            {strings('app_settings.add_device.points.one')}
          </Points>
          <Points number={2}>
            {strings('app_settings.add_device.points.two')}{' '}
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              color={TextColor.TextDefault}
            >
              {strings('app_settings.add_device.points.two_bold_one')}
            </Text>{' '}
            {strings('app_settings.add_device.points.two_icon')}{' '}
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              color={TextColor.TextDefault}
            >
              {strings('app_settings.add_device.points.two_bold_two')}
            </Text>
          </Points>
          <Points number={3}>
            {strings('app_settings.add_device.points.three')}
          </Points>
          <Points number={4}>
            {strings('app_settings.add_device.points.four')}
          </Points>
        </Box>

        <Button twClassName="w-full mt-auto" onPress={openQRScanner}>
          {strings('app_settings.add_device.scan_qr_code_button')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default AddDeviceToWallet;
