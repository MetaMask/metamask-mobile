import React, { useEffect } from 'react';
import { Dimensions } from 'react-native';
import {
  Box,
  Text,
  FontWeight,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { lightTheme } from '@metamask/design-tokens';
import { strings } from '../../../../../../locales/i18n';
import QRCode from 'react-native-qrcode-svg';
import logo from '../../../../../images/branding/fox.png';
import { AddDeviceSettingsStep } from '../constant';

const QR_SIZE = Math.round(Dimensions.get('window').width * 0.65);
const LOGO_SIZE = Math.round(QR_SIZE * 0.2);

interface QrCodeScanProps {
  onScanSuccess: (type: AddDeviceSettingsStep) => void;
}

const QrCodeScan = ({ onScanSuccess }: QrCodeScanProps) => {
  const tw = useTailwind();

  useEffect(() => {
    setTimeout(() => {
      onScanSuccess(AddDeviceSettingsStep.ENTER_VERIFICATION_CODE);
    }, 2000);
  }, [onScanSuccess]);

  return (
    <Box twClassName="p-4 pt-0 flex-1 flex-col gap-4">
      <Text
        variant={TextVariant.HeadingLg}
        twClassName="text-[26px]"
        color={TextColor.TextDefault}
        fontWeight={FontWeight.Bold}
      >
        {strings('app_settings.add_device.scan_qr_code')}
      </Text>
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {strings('app_settings.add_device.scan_qr_code_desc')}
      </Text>
      <Box twClassName="items-center justify-center flex-row mt-4">
        <Box
          style={tw.style('rounded-2xl overflow-hidden p-3')}
          twClassName="bg-white"
        >
          <QRCode
            value="metamask-device-sync"
            size={QR_SIZE}
            color={lightTheme.colors.text.default}
            backgroundColor={lightTheme.colors.background.default}
            logo={logo}
            logoSize={LOGO_SIZE}
            logoBackgroundColor={lightTheme.colors.background.default}
            logoBorderRadius={8}
            logoMargin={4}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default QrCodeScan;
