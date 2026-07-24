import React, { useEffect } from 'react';
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
import { useTheme } from '../../../util/theme';

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

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')}>
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
