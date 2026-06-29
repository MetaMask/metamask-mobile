import React, { useCallback, useEffect, useRef } from 'react';
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
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { strings } from '../../../../locales/i18n';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import Engine from '../../../core/Engine';
import { QrSyncPhases } from '../../../core/QrSync/constants';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { useTheme } from '../../../util/theme';
import {
  selectQrSyncIsSessionActive,
  selectQrSyncPhase,
} from '../../../selectors/qrSyncController';
import { showExtensionCancelledErrorSheet } from './showExtensionCancelledErrorSheet';

const LOADER_SIZE = 48;
const LOADER_BORDER_WIDTH = 4;

const DeviceAddedLoader = () => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1,
    );

    return () => {
      cancelAnimation(rotation);
    };
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View
      testID="device-added-loader"
      style={[
        tw.style('rounded-full', {
          width: LOADER_SIZE,
          height: LOADER_SIZE,
          borderWidth: LOADER_BORDER_WIDTH,
          borderColor: colors.border.muted,
          borderTopColor: colors.primary.default,
        }),
        animatedStyle,
      ]}
    />
  );
};

const DeviceAdded = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const hasNavigatedToImportRef = useRef(false);
  const hasShownErrorSheetRef = useRef(false);
  const phase = useSelector(selectQrSyncPhase);
  const isSessionActive = useSelector(selectQrSyncIsSessionActive);

  const handleBack = useCallback(() => {
    if (phase === QrSyncPhases.PEER_CANCELLED) {
      Engine.context.QrSyncController.acknowledgePeerCancellation();
      return;
    }

    if (isSessionActive) {
      Engine.context.QrSyncController.cancelSession();
    }

    navigation.goBack();
  }, [isSessionActive, navigation, phase]);

  useEffect(() => {
    if (
      phase !== QrSyncPhases.REVIEWING_IMPORT ||
      hasNavigatedToImportRef.current
    ) {
      return;
    }

    hasNavigatedToImportRef.current = true;

    navigation.navigate(Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE, {
      initialStep: 1,
      qrSyncImport: true,
    });
  }, [navigation, phase]);

  useEffect(() => {
    if (
      phase !== QrSyncPhases.PEER_CANCELLED ||
      hasShownErrorSheetRef.current
    ) {
      return;
    }

    hasShownErrorSheetRef.current = true;
    showExtensionCancelledErrorSheet(navigation);
  }, [navigation, phase]);

  useEffect(() => {
    if (phase !== QrSyncPhases.PEER_CANCELLED) {
      hasShownErrorSheetRef.current = false;
    }
  }, [phase]);

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')}>
      <HeaderCompactStandard
        onBack={handleBack}
        backButtonProps={{ testID: 'device-added-back-button' }}
      />
      <Box twClassName="flex-1 px-4 justify-center items-center gap-4">
        <DeviceAddedLoader />
        <Text
          variant={TextVariant.HeadingLg}
          color={TextColor.TextDefault}
          fontWeight={FontWeight.Bold}
          twClassName="text-center"
        >
          {strings('app_settings.add_device.waiting_for_extension')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center px-4"
        >
          {strings('app_settings.add_device.waiting_for_extension_description')}
        </Text>
      </Box>
    </SafeAreaView>
  );
};

export default DeviceAdded;
