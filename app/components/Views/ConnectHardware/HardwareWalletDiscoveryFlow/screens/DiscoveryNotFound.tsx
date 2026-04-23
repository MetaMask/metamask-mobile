import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../../../../util/theme';
import type { DeviceUIConfig, TroubleshootingItem } from '../DiscoveryFlow.types';

const styles = StyleSheet.create({
  container: { width: 240, height: 240 },
});

interface DiscoveryNotFoundScreenProps {
  config: DeviceUIConfig;
  onRetry?: () => void;
  onBack?: () => void;
}

const DiscoveryNotFoundScreen: React.FC<DiscoveryNotFoundScreenProps> = ({
  config,
  onRetry,
  onBack,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={tw.style('flex-1 bg-default')}
    >
      <Box
        twClassName="flex-1 bg-default pt-4"
        alignItems={BoxAlignItems.Center}
      >
        {onBack ? (
          <TouchableOpacity onPress={onBack} testID="discovery-not-found-back">
            <Box twClassName="h-10 w-10 justify-center">
              <MaterialIcon
                name="arrow-back-ios-new"
                size={20}
                color={colors.text.default}
              />
            </Box>
          </TouchableOpacity>
        ) : null}

        <Box twClassName="w-full gap-12 px-4 pt-12">
          <Text variant={TextVariant.HeadingLg} twClassName="text-center w-full">
            {config.strings.deviceNotFound}
          </Text>

          <Box twClassName="px-4">
            {config.troubleshootingItems.map((item: TroubleshootingItem) => (
              <Box
                key={item.id}
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="py-2"
              >
                <Box
                  alignItems={BoxAlignItems.Center}
                  justifyContent={BoxJustifyContent.Center}
                  twClassName="mr-4 h-10 w-10 rounded-full bg-muted"
                >
                  <Icon
                    name={item.icon}
                    size={IconSize.Md}
                    color={IconColor.IconAlternative}
                  />
                </Box>
                <Text variant={TextVariant.BodySm}>{item.label}</Text>
              </Box>
            ))}
          </Box>
        </Box>

        {onRetry ? (
          <Box twClassName="w-full px-4 pb-4 mt-auto">
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={onRetry}
              testID="discovery-retry-button"
            >
              {config.strings.tryAgain}
            </Button>
          </Box>
        ) : null}
      </Box>
    </SafeAreaView>
  );
};

export default DiscoveryNotFoundScreen;
