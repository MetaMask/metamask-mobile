import React from 'react';
import { StyleSheet } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import HeaderStandardGlass from '../../../component-library/components-temp/HeaderStandardGlass';
import { useHeaderGlassInset } from '../../../component-library/components-temp/HeaderGlass';
import ExtensionHandoffAnimation from './ExtensionHandoffAnimation';

const styles = StyleSheet.create({
  content: {
    transform: [{ translateY: -32 }],
  },
});

interface DeviceAddedProps {
  onCancel: () => void;
}

const DeviceAdded = ({ onCancel }: DeviceAddedProps) => {
  const tw = useTailwind();
  const { top: safeAreaTop } = useSafeAreaInsets();
  const { inset: headerInset, onLayout: onHeaderLayout } = useHeaderGlassInset(
    true,
    safeAreaTop,
  );

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandardGlass
        backdrop="static"
        onLayout={onHeaderLayout}
        includesTopInset
        onBack={onCancel}
        backButtonProps={{
          accessibilityLabel: strings('navigation.back'),
        }}
      />
      <Box
        twClassName="flex-1 px-4 justify-center items-center gap-3"
        style={[styles.content, { marginTop: headerInset }]}
      >
        <ExtensionHandoffAnimation />
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
