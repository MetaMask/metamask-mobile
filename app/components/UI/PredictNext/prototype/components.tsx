import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import BoxGlass from '../../../../component-library/components-temp/BoxGlass';
import ModalSafeAreaProvider from '../../../../component-library/components-temp/ModalSafeAreaProvider';
import { useTheme } from '../../../../util/theme';
import { formatUsd, type ProtoAvatar, type ProtoOutcome } from './fixtures';
import type { ProtoPosition } from './PrototypeState';
import { usePrototypeMotion } from './usePrototypeMotion';
import { PALETTE } from './palette';
import { RollingNumber } from './RollingNumber';

const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
  modalHost: { height: 0, position: 'absolute', width: 0 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
});

interface ProtoSheetProps {
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  testID?: string;
}

export const ProtoSheet = ({
  isVisible,
  onClose,
  title,
  children,
  testID,
}: ProtoSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  const close = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.modalHost}>
      <Modal
        visible
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={close}
      >
        <ModalSafeAreaProvider>
          <GestureHandlerRootView style={styles.gestureRoot}>
            <BottomSheet ref={sheetRef} onClose={onClose} testID={testID}>
              {title ? (
                <BottomSheetHeader onClose={close}>{title}</BottomSheetHeader>
              ) : null}
              {typeof children === 'function' ? children(close) : children}
            </BottomSheet>
          </GestureHandlerRootView>
        </ModalSafeAreaProvider>
      </Modal>
    </View>
  );
};

/**
 * The homepage action-button shine: a diagonal sheen over liquid glass, with
 * the opaque muted surface where the OS cannot draw glass.
 */
/**
 * Header control drawn as Apple Liquid Glass, or a muted capsule where the
 * OS cannot draw glass. Children should stay transparent so they don't cover it.
 */
export const GlassNav = ({
  children,
  twClassName = '',
}: {
  children: React.ReactNode;
  twClassName?: string;
}) => {
  const tw = useTailwind();
  return (
    <BoxGlass
      radiusClassName="rounded-full"
      isInteractive
      containerStyle={tw.style('h-10')}
      style={tw.style(
        'h-10 flex-row items-center overflow-hidden',
        twClassName,
      )}
    >
      {children}
    </BoxGlass>
  );
};

interface GlassHeaderAction {
  iconName: IconName;
  onPress: () => void;
  accessibilityLabel: string;
}

/** Event header: glass back button, centered title, glass actions. */
export const GlassHeader = ({
  title,
  onBack,
  actions = [],
}: {
  title?: string;
  onBack: () => void;
  actions?: GlassHeaderAction[];
}) => (
  <HeaderStandard
    includesTopInset
    title={title}
    startAccessory={
      <GlassNav twClassName="w-10 justify-center">
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={onBack}
          accessibilityLabel="Back"
          twClassName="bg-transparent"
        />
      </GlassNav>
    }
    endAccessory={
      actions.length > 0 ? (
        <GlassNav
          twClassName={
            actions.length > 1 ? 'gap-1 px-1' : 'w-10 justify-center'
          }
        >
          {actions.map((action) => (
            <ButtonIcon
              key={action.accessibilityLabel}
              iconName={action.iconName}
              size={ButtonIconSize.Md}
              onPress={action.onPress}
              accessibilityLabel={action.accessibilityLabel}
              twClassName="bg-transparent"
            />
          ))}
        </GlassNav>
      ) : undefined
    }
  />
);

export const SheenSurface = ({
  children,
  radius = 'rounded-2xl',
  twClassName = '',
  style,
}: {
  children: React.ReactNode;
  radius?: `rounded-${string}`;
  twClassName?: string;
  style?: StyleProp<ViewStyle>;
}) => {
  const tw = useTailwind();
  return (
    <BoxGlass
      radiusClassName={radius}
      hasSheen
      isInteractive
      containerStyle={style}
      style={tw.style(twClassName)}
    >
      {children}
    </BoxGlass>
  );
};

/**
 * The card surface for every market: elevated fill, 2px muted outline, 20px
 * corners. Matches the feed cards. Sheen stays on the action tiles.
 */
export const FeedPanel = ({
  children,
  twClassName = '',
  style,
}: {
  children: React.ReactNode;
  twClassName?: string;
  style?: StyleProp<ViewStyle>;
}) => {
  const tw = useTailwind();
  return (
    <View
      style={[
        tw.style(
          `overflow-hidden rounded-[20px] border-2 border-muted bg-elevated1 ${twClassName}`,
        ),
        style,
      ]}
    >
      {children}
    </View>
  );
};

/** Count of contracts held, pinned to the top-right corner of a price button. */
export const PositionBadge = ({ count }: { count: number }) =>
  count > 0 ? (
    <Box
      pointerEvents="none"
      testID="position-badge"
      twClassName="absolute -right-2 -top-2 h-5 min-w-5 items-center justify-center rounded-full border-2 border-elevated1 bg-primary-default px-1"
    >
      <Text
        variant={TextVariant.BodyXs}
        fontWeight={FontWeight.Bold}
        color={TextColor.PrimaryInverse}
        twClassName="leading-4"
      >
        {count > 99 ? '99+' : count}
      </Text>
    </Box>
  ) : null;

export const ProtoAvatarCircle = ({
  avatar,
  size = 40,
}: {
  avatar?: ProtoAvatar;
  size?: number;
}) => {
  const tw = useTailwind();
  if (avatar?.image) {
    const isLogo = avatar.imageFit === 'contain';
    return (
      <Image
        source={avatar.image}
        accessibilityIgnoresInvertColors
        resizeMode={isLogo ? 'contain' : 'cover'}
        style={[
          { width: size, height: size },
          isLogo ? null : { borderRadius: size / 2 },
          avatar.flip ? { transform: [{ scaleX: -1 }] } : null,
        ]}
      />
    );
  }
  return (
    <Box
      style={[
        tw.style('items-center justify-center rounded-full bg-muted'),
        {
          width: size,
          height: size,
          backgroundColor: avatar?.color,
        },
      ]}
    >
      <Text
        variant={size >= 36 ? TextVariant.BodyMd : TextVariant.BodyXs}
        fontWeight={FontWeight.Bold}
        style={{ color: avatar?.textColor ?? PALETTE.white }}
      >
        {avatar?.text ?? ''}
      </Text>
    </Box>
  );
};

/**
 * Secondary price button. Plain by default. The current favorite uses the
 * success color, and a tie highlights nothing.
 */
export const PricePill = ({
  price,
  isLeading = false,
  badge = 0,
  onPress,
  testID,
}: {
  price: number;
  isLeading?: boolean;
  /** Contracts held in this outcome. Shows the count badge when above 0. */
  badge?: number;
  onPress: () => void;
  testID?: string;
}) => {
  const tw = useTailwind();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Buy at ${price} percent`}
      hitSlop={6}
      style={({ pressed }) =>
        tw.style(
          'h-10 w-16 items-center justify-center rounded-full border-2',
          isLeading ? 'border-success-muted' : 'border-muted',
          pressed && 'bg-pressed',
        )
      }
    >
      <RollingNumber
        value={`${price}%`}
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Bold}
        color={isLeading ? TextColor.SuccessDefault : TextColor.TextDefault}
      />
      <PositionBadge count={badge} />
    </Pressable>
  );
};

/** Secondary action: outlined pill. Primary actions keep the DS button. */
export const SecondaryButton = ({
  label,
  onPress,
  children,
  isFlexible = true,
  isLeading = false,
  badge = 0,
  testID,
}: {
  label?: string;
  onPress: () => void;
  children?: React.ReactNode;
  isFlexible?: boolean;
  isLeading?: boolean;
  /** Contracts held in this outcome. Shows the count badge when above 0. */
  badge?: number;
  testID?: string;
}) => {
  const tw = useTailwind();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      style={({ pressed }) =>
        tw.style(
          'h-12 flex-row items-center justify-center gap-2 rounded-full border-2 px-4',
          isFlexible && 'flex-1',
          isLeading ? 'border-success-muted' : 'border-muted',
          pressed && 'bg-pressed',
          pressed && { transform: [{ scale: 0.97 }] },
        )
      }
    >
      {children ?? (
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {label}
        </Text>
      )}
      <PositionBadge count={badge} />
    </Pressable>
  );
};

/** Category or league mark. Doubles as the fallback where a logo can't be used. */
export const IconTile = ({
  iconName,
  size = 40,
}: {
  iconName: IconName;
  size?: number;
}) => {
  const tw = useTailwind();
  return (
    <Box
      style={[
        tw.style('items-center justify-center rounded-lg bg-muted'),
        { width: size, height: size },
      ]}
    >
      <Icon
        name={iconName}
        size={size >= 36 ? IconSize.Md : IconSize.Sm}
        color={IconColor.IconDefault}
      />
    </Box>
  );
};

export const ProbabilityBar = ({
  value,
  color,
}: {
  value: number;
  color: string;
}) => {
  const tw = useTailwind();
  return (
    <Box twClassName="h-0.5 w-full">
      <View
        style={[
          tw.style('h-0.5 rounded-full'),
          {
            width: `${Math.max(4, Math.min(100, value))}%`,
            backgroundColor: color,
          },
        ]}
      />
    </Box>
  );
};

export const LiveDot = ({ color = PALETTE.green }: { color?: string }) => {
  const { shouldAnimate } = usePrototypeMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!shouldAnimate) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.25,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, shouldAnimate]);
  return (
    <Animated.View
      style={[styles.liveDot, { backgroundColor: color, opacity }]}
    />
  );
};

export type ProtoEventStatus =
  | { kind: 'live'; label?: string; isClosing?: boolean }
  | { kind: 'upcoming'; label: string }
  | { kind: 'final'; label?: string };

const STATUS_ALIGN = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
} as const;

/**
 * Live, upcoming, or final. Cards keep Live and the clock on one line so the
 * header stays short. Event pages stack them. The dot stays green until the
 * event is about to end.
 */
export const EventStatus = ({
  status,
  align = 'end',
  isStacked = false,
}: {
  status: ProtoEventStatus;
  align?: keyof typeof STATUS_ALIGN;
  isStacked?: boolean;
}) => {
  const { colors } = useTheme();
  if (status.kind === 'live') {
    const isClosing = Boolean(status.isClosing);
    const tone = isClosing ? TextColor.ErrorDefault : TextColor.SuccessDefault;
    const dot = isClosing ? colors.error.default : colors.success.default;
    const liveLabel = (
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={tone}
      >
        Live
      </Text>
    );
    if (!isStacked) {
      return (
        <Box twClassName="min-w-0 flex-row items-center gap-1.5">
          <LiveDot color={dot} />
          {liveLabel}
          {status.label ? (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              numberOfLines={1}
            >
              {`· ${status.label}`}
            </Text>
          ) : null}
        </Box>
      );
    }
    return (
      <Box twClassName={`min-w-0 gap-0.5 ${STATUS_ALIGN[align]}`}>
        <Box twClassName="flex-row items-center gap-1.5">
          <LiveDot color={dot} />
          {liveLabel}
        </Box>
        {status.label ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {status.label}
          </Text>
        ) : null}
      </Box>
    );
  }
  if (status.kind === 'upcoming') {
    return (
      <Box twClassName="min-w-0 flex-row items-center gap-1">
        <Icon
          name={IconName.Clock}
          size={IconSize.Xs}
          color={IconColor.IconAlternative}
        />
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          {status.label}
        </Text>
      </Box>
    );
  }
  return (
    <Text
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextAlternative}
      numberOfLines={1}
    >
      {status.label ? `Final · ${status.label}` : 'Final'}
    </Text>
  );
};

/** Index of the favorite, or -1 when the top prices tie. */
export const leadingIndex = (outcomes: { price: number }[]) => {
  const top = Math.max(...outcomes.map(({ price }) => price));
  const leaders = outcomes.filter(({ price }) => price === top);
  return leaders.length === 1
    ? outcomes.findIndex(({ price }) => price === top)
    : -1;
};

export const OutcomeRow = ({
  outcome,
  onPress,
  showAvatar = true,
  isLeading = false,
  badge = 0,
}: {
  outcome: ProtoOutcome;
  onPress: () => void;
  showAvatar?: boolean;
  isLeading?: boolean;
  badge?: number;
}) => (
  <Box twClassName="flex-row items-center gap-3">
    {showAvatar && outcome.avatar ? (
      <ProtoAvatarCircle avatar={outcome.avatar} />
    ) : null}
    <Box twClassName="flex-1 gap-2">
      <Text variant={TextVariant.BodyMd} numberOfLines={1}>
        {outcome.label}
      </Text>
      <ProbabilityBar value={outcome.price} color={outcome.color} />
    </Box>
    {outcome.detail ? (
      <Text variant={TextVariant.BodyMd} twClassName="w-16 text-right">
        {outcome.detail}
      </Text>
    ) : null}
    <PricePill
      price={outcome.price}
      isLeading={isLeading}
      badge={badge}
      onPress={onPress}
    />
  </Box>
);

export const SectionHeader = ({
  title,
  volume,
  isCollapsed,
  onPress,
}: {
  title: string;
  volume?: string;
  isCollapsed?: boolean;
  onPress?: () => void;
}) => (
  <Pressable onPress={onPress} accessibilityRole="button">
    <Box twClassName="flex-row items-center justify-between px-4 py-4">
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
        {title}
      </Text>
      <Box twClassName="flex-row items-center gap-2">
        {volume ? (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {volume}
          </Text>
        ) : null}
        {onPress ? (
          <Icon
            name={isCollapsed ? IconName.ArrowDown : IconName.ArrowUp}
            size={IconSize.Sm}
          />
        ) : null}
      </Box>
    </Box>
  </Pressable>
);

const clearBackground = (color: string) =>
  color.startsWith('#') && color.length === 7 ? `${color}00` : 'transparent';

/**
 * Fades a horizontal row into the page background across the 16pt side margin,
 * so scrolled cards dissolve at the gutter instead of clipping on the screen edge.
 */
export const MarginFades = ({ children }: { children: React.ReactNode }) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const solid = colors.background.default;
  const clear = clearBackground(solid);
  return (
    <Box>
      {children}
      <LinearGradient
        pointerEvents="none"
        colors={[solid, clear]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={tw.style('absolute inset-y-0 left-0 w-4')}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[clear, solid]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={tw.style('absolute inset-y-0 right-0 w-4')}
      />
    </Box>
  );
};

export const FeedSectionTitle = ({
  title,
  onPress,
}: {
  title: string;
  onPress?: () => void;
}) => (
  <Pressable onPress={onPress} accessibilityRole="header">
    <Box twClassName="flex-row items-center gap-1 px-4">
      <Text variant={TextVariant.HeadingMd}>{title}</Text>
      <Icon
        name={IconName.ArrowRight}
        size={IconSize.Sm}
        color={IconColor.IconAlternative}
      />
    </Box>
  </Pressable>
);

export const Chip = ({
  label,
  iconName,
  isSelected,
  onPress,
}: {
  label: string;
  iconName?: IconName;
  isSelected?: boolean;
  onPress: () => void;
}) => {
  const tw = useTailwind();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) =>
        tw.style(
          'h-10 flex-row items-center gap-1.5 rounded-full px-3',
          isSelected ? 'bg-icon-default' : pressed ? 'bg-pressed' : 'bg-muted',
        )
      }
    >
      {iconName ? (
        <Icon
          name={iconName}
          size={IconSize.Sm}
          color={isSelected ? IconColor.IconInverse : IconColor.IconAlternative}
        />
      ) : null}
      <Text
        variant={TextVariant.ButtonLabelMd}
        fontWeight={FontWeight.Medium}
        color={isSelected ? undefined : TextColor.TextAlternative}
        twClassName={isSelected ? 'text-icon-inverse' : undefined}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export const UnderlineTabs = <T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) => {
  const tw = useTailwind();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tw.style('px-4 gap-6')}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Box
              twClassName={`pb-2 border-b-2 ${
                isActive ? 'border-icon-default' : 'border-transparent'
              }`}
            >
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={isActive ? FontWeight.Bold : FontWeight.Medium}
                color={
                  isActive ? TextColor.TextDefault : TextColor.TextAlternative
                }
              >
                {tab.label}
              </Text>
            </Box>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

export const RangeChips = <T extends string>({
  ranges,
  value,
  onChange,
}: {
  ranges: readonly T[];
  value: T;
  onChange: (range: T) => void;
}) => {
  const tw = useTailwind();
  return (
    <Box twClassName="flex-row items-center justify-between px-4">
      {ranges.map((range) => {
        const isActive = range === value;
        return (
          <Pressable
            key={range}
            onPress={() => onChange(range)}
            style={tw.style('rounded-full px-3 py-1.5', isActive && 'bg-muted')}
          >
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={
                isActive ? TextColor.TextDefault : TextColor.TextAlternative
              }
            >
              {range}
            </Text>
          </Pressable>
        );
      })}
    </Box>
  );
};

export const PositionCard = ({
  position,
  onBuyMore,
  onCashOut,
}: {
  position: ProtoPosition;
  onBuyMore: () => void;
  onCashOut: () => void;
}) => {
  const value = (position.contracts * position.currentPrice) / 100;
  const cost = (position.contracts * position.avgPrice) / 100;
  const pnl = value - cost;
  const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0;
  const isUp = pnl >= 0;
  return (
    <SheenSurface twClassName="gap-4 p-4">
      <Box twClassName="flex-row items-center gap-3">
        <ProtoAvatarCircle avatar={position.avatar} size={32} />
        <Box twClassName="min-w-0 flex-1">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Bold}
            numberOfLines={1}
          >
            {position.label}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {`${position.contracts} shares · ${position.currentPrice}% chance`}
          </Text>
        </Box>
        <Box twClassName="shrink-0 items-end">
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
            {formatUsd(value)}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={isUp ? TextColor.SuccessDefault : TextColor.ErrorDefault}
          >
            {`${isUp ? '+' : '-'}${formatUsd(Math.abs(pnl))} (${
              isUp ? '+' : '-'
            }${Math.abs(pnlPercent).toFixed(1)}%)`}
          </Text>
        </Box>
      </Box>
      <Box twClassName="flex-row gap-2">
        <SecondaryButton label="Buy more" onPress={onBuyMore} />
        <SecondaryButton label="Cash out" onPress={onCashOut} />
      </Box>
    </SheenSurface>
  );
};
