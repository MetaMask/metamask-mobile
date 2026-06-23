import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';
import { useNavigation } from '@react-navigation/native';
import Engine from '../../../core/Engine';
import { selectQrSyncIsSessionActive } from '../../../selectors/qrSyncController';

const DeviceAdded = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const isSessionActive = useSelector(selectQrSyncIsSessionActive);

  const handleBack = useCallback(() => {
    if (isSessionActive) {
      Engine.context.QrSyncController.cancelSession();
    }

    navigation.goBack();
  }, [isSessionActive, navigation]);

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')}>
      <HeaderCompactStandard onBack={handleBack} />
      <Box twClassName="flex-1 px-4 justify-center items-center">
        <Text
          variant={TextVariant.HeadingLg}
          color={TextColor.TextDefault}
          fontWeight={FontWeight.Bold}
        >
          {strings('app_settings.add_device.device_added')}
        </Text>
      </Box>
    </SafeAreaView>
  );
};

export default DeviceAdded;
