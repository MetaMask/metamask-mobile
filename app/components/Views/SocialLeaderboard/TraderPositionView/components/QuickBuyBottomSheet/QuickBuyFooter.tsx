import React, { useCallback, useEffect, useRef } from 'react';
import { type LayoutChangeEvent, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  Button,
  ButtonVariant,
  ButtonBaseSize,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  AvatarToken,
  AvatarTokenSize,
  BadgeWrapper,
  BadgeWrapperPosition,
  BadgeNetwork,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import { getNetworkImageSource } from '../../../../../../util/networks';
import type { Hex } from '@metamask/utils';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import SourceTokenPicker from './SourceTokenPicker';
import { getBridgeTokenImageSource } from './getBridgeTokenImageSource';
import { strings } from '../../../../../../../locales/i18n';

const USD_PRESETS = ['1', '20', '50', '100'];

const PAY_WITH_ANIMATION_DURATION_MS = 220;
const PAY_WITH_ANIMATION_EASING = Easing.out(Easing.cubic);

interface QuickBuyFooterProps {
  usdAmount: string;
  sourceToken: BridgeToken | undefined;
  sourceChainId: Hex | undefined;
  sourceTokenOptions: BridgeToken[];
  selectedSourceToken: BridgeToken | undefined;
  isSourcePickerOpen: boolean;
  setIsSourcePickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedSourceToken: React.Dispatch<
    React.SetStateAction<BridgeToken | undefined>
  >;
  sourceBalanceFiat: string | undefined;
  isTotalLoading: boolean;
  onPresetPress: (preset: string) => void;
  colors: { icon: { alternative: string } };
}

const QuickBuyFooter: React.FC<QuickBuyFooterProps> = ({
  usdAmount,
  sourceToken,
  sourceChainId,
  sourceTokenOptions,
  selectedSourceToken,
  isSourcePickerOpen,
  setIsSourcePickerOpen,
  setSelectedSourceToken,
  sourceBalanceFiat,
  isTotalLoading: _isTotalLoading,
  onPresetPress,
  colors,
}) => {
  const tw = useTailwind();

  // Animate the source picker's real `height` so React Native's layout system
  // re-measures the parent BottomSheet on each frame; this lets the whole sheet
  // grow/shrink smoothly instead of jumping.
  const pickerHeight = useSharedValue(0);
  const measuredPickerHeight = useRef(0);

  const animatedPickerStyle = useAnimatedStyle(() => ({
    height: pickerHeight.value,
  }));

  const handlePickerLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      if (height <= 0 || height === measuredPickerHeight.current) return;
      measuredPickerHeight.current = height;
      if (isSourcePickerOpen) {
        pickerHeight.value = withTiming(height, {
          duration: PAY_WITH_ANIMATION_DURATION_MS,
          easing: PAY_WITH_ANIMATION_EASING,
        });
      }
    },
    [isSourcePickerOpen, pickerHeight],
  );

  useEffect(() => {
    pickerHeight.value = withTiming(
      isSourcePickerOpen ? measuredPickerHeight.current : 0,
      {
        duration: PAY_WITH_ANIMATION_DURATION_MS,
        easing: PAY_WITH_ANIMATION_EASING,
      },
    );
  }, [isSourcePickerOpen, pickerHeight]);

  const handleSourcePickerToggle = useCallback(() => {
    setIsSourcePickerOpen((prev) => !prev);
  }, [setIsSourcePickerOpen]);

  const handleSourceTokenSelect = useCallback(
    (token: BridgeToken) => {
      setSelectedSourceToken(token);
      setIsSourcePickerOpen(false);
    },
    [setSelectedSourceToken, setIsSourcePickerOpen],
  );

  return (
    <Box twClassName="w-full">
      {/* Preset pills */}
      <Box twClassName="pt-4 pb-6 px-4">
        <Box flexDirection={BoxFlexDirection.Row} gap={3}>
          {USD_PRESETS.map((preset) => (
            <Box key={preset} twClassName="flex-1">
              <Button
                variant={
                  usdAmount === preset
                    ? ButtonVariant.Primary
                    : ButtonVariant.Secondary
                }
                size={ButtonBaseSize.Md}
                onPress={() => onPresetPress(preset)}
                isFullWidth
                testID={`quick-buy-preset-${preset}`}
              >
                {`$${preset}`}
              </Button>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Pay with card (tap to expand source picker inline) */}
      <Box twClassName="px-4 pb-6">
        <Box twClassName="rounded-xl bg-muted overflow-hidden">
          <TouchableOpacity
            onPress={handleSourcePickerToggle}
            disabled={sourceTokenOptions.length === 0}
            activeOpacity={0.7}
            testID="quick-buy-pay-with-row"
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
              twClassName="px-4 py-3"
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('social_leaderboard.quick_buy.pay_with')}
              </Text>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={2}
              >
                <BadgeWrapper
                  position={BadgeWrapperPosition.BottomRight}
                  badge={
                    sourceChainId ? (
                      <BadgeNetwork
                        name={sourceToken?.symbol ?? ''}
                        src={getNetworkImageSource({
                          chainId: sourceChainId,
                        })}
                        twClassName="scale-75"
                      />
                    ) : null
                  }
                >
                  <AvatarToken
                    name={sourceToken?.symbol ?? ''}
                    src={
                      sourceToken
                        ? getBridgeTokenImageSource(sourceToken)
                        : undefined
                    }
                    size={AvatarTokenSize.Xs}
                  />
                </BadgeWrapper>
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextDefault}
                >
                  {sourceToken?.symbol ?? ''}
                </Text>
                {sourceBalanceFiat && (
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                  >
                    {`(${sourceBalanceFiat})`}
                  </Text>
                )}
                <Icon
                  name={
                    isSourcePickerOpen ? IconName.ArrowUp : IconName.ArrowDown
                  }
                  size={IconSize.Sm}
                  color={colors.icon.alternative}
                />
              </Box>
            </Box>
          </TouchableOpacity>

          <Animated.View
            pointerEvents={isSourcePickerOpen ? 'auto' : 'none'}
            style={[tw.style('overflow-hidden'), animatedPickerStyle]}
          >
            <View
              onLayout={handlePickerLayout}
              style={tw.style('absolute inset-x-0 top-0')}
            >
              <SourceTokenPicker
                options={sourceTokenOptions}
                selectedToken={selectedSourceToken}
                onSelect={handleSourceTokenSelect}
              />
            </View>
          </Animated.View>
        </Box>
      </Box>
    </Box>
  );
};

export default QuickBuyFooter;
