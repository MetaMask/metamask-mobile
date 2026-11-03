import React, { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../locales/i18n';
import { useHeaderGlassInset } from '../../../component-library/components-temp/HeaderGlass';
import HeaderStandardGlass from '../../../component-library/components-temp/HeaderStandardGlass';
import {
  TAB_BAR_FLOATING_HEIGHT,
  TAB_BAR_FLOATING_HORIZONTAL_INSET,
  TAB_BAR_FLOATING_ICON_SIZE,
  TAB_BAR_FLOATING_LABEL_FONT_SIZE,
  TAB_BAR_FLOATING_LABEL_LINE_HEIGHT,
} from '../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.constants';
import TabBarFloatingSurface from '../../../component-library/components/Navigation/TabBarFloating/TabBarFloatingSurface';
import { useBlurMaterial } from '../../../component-library/hooks/useBlurMaterial';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { useNetworkTier } from '../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../util/deviceCapability';
import { useTheme } from '../../../util/theme';
import { AppThemeKey } from '../../../util/theme/models';
import {
  GLASS_DEPTH_NETWORKS,
  GLASS_DEPTH_TEST_IDS,
  GLASS_DEPTH_TOKENS,
  type GlassDepthMode,
} from './GlassDepthPrototype.constants';
import { shouldDrawPrototypeBlur } from './shouldDrawPrototypeBlur';

const COPY = 'app_settings.developer_options.glass_depth';
const SCROLL_STYLE = { flex: 1 };

interface ModeToggleProps {
  mode: GlassDepthMode;
  onChange: (mode: GlassDepthMode) => void;
}

const ModeToggle = ({ mode, onChange }: ModeToggleProps) => (
  <Box flexDirection={BoxFlexDirection.Row} gap={2}>
    <Box twClassName="flex-1">
      <Button
        variant={
          mode === 'flat' ? ButtonVariant.Primary : ButtonVariant.Secondary
        }
        size={ButtonSize.Md}
        isFullWidth
        onPress={() => onChange('flat')}
        accessibilityState={{ selected: mode === 'flat' }}
      >
        {strings(`${COPY}.flat`)}
      </Button>
    </Box>
    <Box twClassName="flex-1">
      <Button
        variant={
          mode === 'layered' ? ButtonVariant.Primary : ButtonVariant.Secondary
        }
        size={ButtonSize.Md}
        isFullWidth
        onPress={() => onChange('layered')}
        accessibilityState={{ selected: mode === 'layered' }}
      >
        {strings(`${COPY}.layered`)}
      </Button>
    </Box>
  </Box>
);

const TAB_ITEMS = [
  { labelKey: `${COPY}.tab_home`, icon: IconName.Home, isActive: true },
  {
    labelKey: `${COPY}.tab_activity`,
    icon: IconName.Activity,
    isActive: false,
  },
  { labelKey: `${COPY}.tab_settings`, icon: IconName.Setting, isActive: false },
] as const;

/**
 * Space between the last readable card and the floating bar. The network chips
 * sit in this gap on purpose so they can pass under the material.
 */
const CONTENT_CLEARANCE = 24;
const CONTENT_CONTAINER_STYLE = { paddingBottom: CONTENT_CLEARANCE };

/**
 * Dev-only wallet stand-in. Flat mode is the current home treatment: one
 * `background.default` fill under the glass chrome. Layered mode is the
 * proposed content layer: a sunken canvas, opaque cards, and a color wash
 * the bars can sample. It does not change the production wallet.
 *
 * Blur follows `shouldDrawPrototypeBlur` (hardware × network). The header and
 * tab bar still fall back inside `useLiquidGlass` / `useBlurMaterial` when
 * the OS cannot draw a material.
 */
const GlassDepthPrototype = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const insets = useSafeAreaInsets();
  const { themeAppearance, shadows } = useTheme();
  const isDark = themeAppearance === AppThemeKey.dark;
  const [hardwareTier] = useState(getHardwareTier);
  const networkTier = useNetworkTier();
  const blurAllowed = shouldDrawPrototypeBlur(hardwareTier, networkTier);
  const { isBlurAvailable, colorScheme } = useBlurMaterial();
  const drawBlur = blurAllowed && isBlurAvailable;
  const { inset, onLayout } = useHeaderGlassInset(blurAllowed);
  const [mode, setMode] = useState<GlassDepthMode>('flat');
  const isLayered = mode === 'layered';

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const cardClassName = isDark
    ? 'border border-muted bg-section'
    : 'border border-muted bg-default';
  const cardStyle =
    isLayered && !isDark ? [shadows.size.sm, { elevation: 2 }] : undefined;
  const accentPadding = { paddingTop: blurAllowed ? inset : 16 };

  return (
    <Box
      twClassName={`flex-1 ${isLayered ? 'bg-alternative' : 'bg-default'}`}
      testID={GLASS_DEPTH_TEST_IDS.SCREEN}
    >
      <HeaderStandardGlass
        isGlass={blurAllowed}
        backdrop="static"
        title={strings(`${COPY}.screen_title`)}
        onBack={handleBack}
        onLayout={onLayout}
        includesTopInset
      />
      <ScrollView
        style={SCROLL_STYLE}
        contentContainerStyle={CONTENT_CONTAINER_STYLE}
      >
        <Box
          paddingHorizontal={4}
          paddingBottom={4}
          twClassName={isLayered ? 'bg-primary-muted' : undefined}
          style={accentPadding}
          testID={isLayered ? GLASS_DEPTH_TEST_IDS.ACCENT : undefined}
        >
          <ModeToggle mode={mode} onChange={setMode} />
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="mt-3"
            testID={GLASS_DEPTH_TEST_IDS.NOTE}
          >
            {strings(isLayered ? `${COPY}.layered_note` : `${COPY}.flat_note`)}
          </Text>
          <Box
            marginTop={4}
            padding={isLayered ? 4 : 0}
            twClassName={isLayered ? `rounded-2xl ${cardClassName}` : undefined}
            style={cardStyle}
            testID={isLayered ? GLASS_DEPTH_TEST_IDS.BALANCE_CARD : undefined}
          >
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings(`${COPY}.balance_label`)}
            </Text>
            <Text variant={TextVariant.DisplayMd} twClassName="mt-1">
              {strings(`${COPY}.balance_value`)}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.SuccessDefault}
              twClassName="mt-1"
            >
              {strings(`${COPY}.balance_change`)}
            </Text>
          </Box>
        </Box>

        <Box
          marginHorizontal={4}
          marginTop={4}
          paddingVertical={2}
          twClassName={isLayered ? `rounded-2xl ${cardClassName}` : undefined}
          style={cardStyle}
          testID={
            isLayered
              ? GLASS_DEPTH_TEST_IDS.TOKEN_CARD
              : GLASS_DEPTH_TEST_IDS.TOKEN_LIST
          }
        >
          <Text
            variant={TextVariant.HeadingSm}
            fontWeight={FontWeight.Medium}
            twClassName="px-4 py-2"
          >
            {strings(`${COPY}.tokens_title`)}
          </Text>
          {GLASS_DEPTH_TOKENS.map((token) => (
            <Box
              key={token.symbol}
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={3}
              paddingHorizontal={4}
              paddingVertical={3}
            >
              <Box
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Center}
                twClassName="h-10 w-10 rounded-full bg-muted"
              >
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                >
                  {token.symbol.slice(0, 1)}
                </Text>
              </Box>
              <Box twClassName="flex-1">
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                >
                  {token.name}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {token.balance}
                </Text>
              </Box>
              <Box alignItems={BoxAlignItems.End}>
                <Text variant={TextVariant.BodyMd}>{token.fiat}</Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={
                    token.isPositive
                      ? TextColor.SuccessDefault
                      : TextColor.ErrorDefault
                  }
                >
                  {token.change}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>

        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          twClassName="px-4 pt-4"
        >
          {strings(`${COPY}.capability`, {
            hardware: hardwareTier ?? strings(`${COPY}.unknown_tier`),
            network: networkTier ?? strings(`${COPY}.unknown_tier`),
            blur: strings(drawBlur ? `${COPY}.blur_on` : `${COPY}.blur_off`),
          })}
        </Text>

        <Box
          flexDirection={BoxFlexDirection.Row}
          gap={2}
          paddingHorizontal={4}
          paddingTop={4}
          style={{ paddingBottom: TAB_BAR_FLOATING_HEIGHT }}
        >
          {GLASS_DEPTH_NETWORKS.map((network) => (
            <Box
              key={network.label}
              paddingHorizontal={3}
              paddingVertical={2}
              twClassName={
                isLayered
                  ? `rounded-full ${network.fillClassName}`
                  : 'rounded-full'
              }
            >
              <Text variant={TextVariant.BodySm}>{network.label}</Text>
            </Box>
          ))}
        </Box>
      </ScrollView>

      <Box
        pointerEvents="box-none"
        twClassName="absolute left-0 right-0 z-10"
        style={{
          bottom: Math.max(insets.bottom, 16),
          paddingHorizontal: TAB_BAR_FLOATING_HORIZONTAL_INSET,
        }}
      >
        <TabBarFloatingSurface
          isBlurAvailable={drawBlur}
          colorScheme={colorScheme}
          twClassName="rounded-full"
          style={{ height: TAB_BAR_FLOATING_HEIGHT }}
          testID={GLASS_DEPTH_TEST_IDS.TAB_BAR}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Around}
            twClassName="h-full"
          >
            {TAB_ITEMS.map((tab) => (
              <Box key={tab.labelKey} alignItems={BoxAlignItems.Center}>
                <Icon
                  name={tab.icon}
                  size={TAB_BAR_FLOATING_ICON_SIZE}
                  color={
                    tab.isActive
                      ? IconColor.IconDefault
                      : IconColor.IconAlternative
                  }
                />
                <Text
                  variant={TextVariant.BodyXs}
                  fontWeight={
                    tab.isActive ? FontWeight.Medium : FontWeight.Regular
                  }
                  color={
                    tab.isActive
                      ? TextColor.TextDefault
                      : TextColor.TextAlternative
                  }
                  style={{
                    fontSize: TAB_BAR_FLOATING_LABEL_FONT_SIZE,
                    lineHeight: TAB_BAR_FLOATING_LABEL_LINE_HEIGHT,
                  }}
                  maxFontSizeMultiplier={1}
                >
                  {strings(tab.labelKey)}
                </Text>
              </Box>
            ))}
          </Box>
        </TabBarFloatingSurface>
      </Box>
    </Box>
  );
};

export default GlassDepthPrototype;
