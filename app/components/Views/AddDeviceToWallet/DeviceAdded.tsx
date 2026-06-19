import React, { useEffect, useRef } from 'react';
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
import type { RootState } from '../../../reducers';
import { strings } from '../../../../locales/i18n';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import { QrSyncPhases } from '../../../core/QrSync/constants';

const DeviceAdded = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const hasNavigatedToCreatePasswordRef = useRef(false);
  const qrSyncState = useSelector(
    (state: RootState) => state.engine.backgroundState.QrSyncController,
  );

  useEffect(() => {
    if (
      hasNavigatedToCreatePasswordRef.current ||
      qrSyncState?.phase !== QrSyncPhases.REVIEWING_IMPORT ||
      !qrSyncState?.review
    ) {
      return;
    }

    hasNavigatedToCreatePasswordRef.current = true;

    navigation.navigate(Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE, {
      initialStep: 1,
      qrSyncImport: true,
    });
  }, [navigation, qrSyncState?.phase, qrSyncState?.review]);

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')}>
      <HeaderCompactStandard onBack={() => navigation.goBack()} />
      <Box twClassName="flex-1 px-4 justify-center items-center">
        <Text
          variant={TextVariant.HeadingLg}
          color={TextColor.TextDefault}
          fontWeight={FontWeight.Bold}
        >
          {strings('app_settings.add_device.device_added')} Loading...
        </Text>
      </Box>
    </SafeAreaView>
  );
};

export default DeviceAdded;
