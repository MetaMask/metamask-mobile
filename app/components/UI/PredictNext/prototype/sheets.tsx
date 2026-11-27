import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Image,
  LayoutAnimation,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Reanimated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  Box,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Spinner,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import { IconName as ToastIconName } from '../../../../component-library/components/Icons/Icon';
import {
  ButtonIconVariant,
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { useTheme } from '../../../../util/theme';
import { OrderAmountInput } from './OrderAmountInput';
import { OrderKeypad } from './OrderKeypad';
import { MM_FOX } from './assets';
import { CommentsSheetContent } from './CommentsSheet';
import { formatUsd, quoteOrder } from './fixtures';
import { PALETTE } from './palette';
import {
  IconTile,
  SecondaryButton,
  ProtoAvatarCircle,
  ProtoSheet,
} from './components';
import { usePrototypeMotion } from './usePrototypeMotion';
import {
  PositionOpened,
  shareCode,
  type PositionShareModel,
} from './PositionShare';
import {
  MODAL_HANDOFF_MS,
  usePrototypeState,
  type ProtoOrderIntent,
  type ProtoOrderOption,
} from './PrototypeState';

const SUBMIT_DELAY_MS = 1100;
const MAX_DIGITS = 7;
const QUICK_PERCENTS = [0.25, 0.5, 0.75, 1] as const;

/**
 * iOS sheet motion: SwiftUI's default `spring(duration: 0.5, bounce: 0)`.
 * Critically damped, so a sheet grows or settles with no bounce.
 */
const APPLE_SHEET_SPRING = { duration: 500, dampingRatio: 1 } as const;
/** 4 rows of 48 plus the 12pt gaps and 16pt vertical padding, until layout measures it. */
const KEYPAD_HEIGHT_FALLBACK = 260;
/** Lets the full-screen modal slide away before the trade toast appears. */
const FULL_SCREEN_DISMISS_MS = 400;

let pendingTradeTimer: ReturnType<typeof setTimeout> | undefined;

/** Resolves a simulated trade after the sheet has closed. */
const runAfterTradeDelay = (finish: () => void) => {
  if (pendingTradeTimer) {
    clearTimeout(pendingTradeTimer);
  }
  pendingTradeTimer = setTimeout(() => {
    pendingTradeTimer = undefined;
    finish();
  }, SUBMIT_DELAY_MS);
};

/**
 * The app's trade toasts: a dismissible spinner that stays up while the
 * trade is in progress, then the top-aligned success toast that replaces it.
 */
const usePrototypeTradeToasts = () => {
  const { toastRef } = useContext(ToastContext);
  const { colors } = useTheme();

  const showInProgress = useCallback(
    (title: string, description: string) => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: ToastIconName.Loading,
        hasNoTimeout: true,
        labelOptions: [
          { label: title, isBold: true },
          { label: '\n', isBold: false },
          { label: description, isBold: false },
        ],
        startAccessory: (
          <Spinner
            color={IconColor.IconDefault}
            spinnerIconProps={{ size: IconSize.Lg }}
          />
        ),
        closeButtonOptions: {
          variant: ButtonIconVariant.Icon,
          iconName: ToastIconName.Close,
          onPress: () => {
            toastRef?.current?.closeToast();
          },
        },
      });
    },
    [toastRef],
  );

  const showSuccess = useCallback(
    (title: string, description: string) => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: ToastIconName.Confirmation,
        iconColor: colors.success.default,
        hasNoTimeout: false,
        labelOptions: [
          { label: title, isBold: true },
          { label: '\n', isBold: false },
          { label: description, isBold: false },
        ],
      });
    },
    [colors.success.default, toastRef],
  );

  const dismiss = useCallback(() => {
    toastRef?.current?.closeToast();
  }, [toastRef]);

  return { showInProgress, showSuccess, dismiss };
};

const styles = StyleSheet.create({
  foxLogo: { height: 48, width: 48, zIndex: 1 },
  kalshiPill: {
    backgroundColor: PALETTE.kalshi,
    height: 38,
    marginLeft: -14,
    paddingLeft: 22,
    paddingRight: 14,
  },
});

const percentLabel = (value: number) =>
  value === 1 ? 'Max' : `${Math.round(value * 100)}%`;

const QuickRow = ({ onSelect }: { onSelect: (fraction: number) => void }) => (
  <Box twClassName="flex-row gap-2">
    {QUICK_PERCENTS.map((fraction) => (
      <SecondaryButton
        key={fraction}
        label={percentLabel(fraction)}
        onPress={() => onSelect(fraction)}
      />
    ))}
  </Box>
);

/**
 * Avatar, market, and the pick on the left; actions on the right. The right
 * inset is trimmed by the icon button's own padding so its glyph lines up with
 * the 16pt content edge below.
 */
const SheetHeaderRow = ({
  title,
  option,
  canSwap,
  onSwap,
  onClose,
  onExpand,
}: {
  title: string;
  option: ProtoOrderOption;
  canSwap: boolean;
  onSwap: () => void;
  onClose: () => void;
  onExpand?: () => void;
}) => (
  <Box twClassName="flex-row items-center gap-3 pb-2 pl-4 pr-2.5 pt-2">
    <ProtoAvatarCircle avatar={option.avatar} size={40} />
    <Box twClassName="min-w-0 flex-1 gap-0.5">
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        numberOfLines={1}
      >
        {title}
      </Text>
      <Pressable
        onPress={canSwap ? onSwap : undefined}
        accessibilityRole="button"
        accessibilityLabel={`${option.label}, ${option.price} percent chance`}
        hitSlop={8}
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Bold}
          color={TextColor.SuccessDefault}
          numberOfLines={1}
        >
          {`${option.label} · ${option.price}% chance`}
        </Text>
      </Pressable>
    </Box>
    {onExpand ? (
      <ButtonIcon
        iconName={IconName.Expand}
        onPress={onExpand}
        accessibilityLabel="Open full screen"
      />
    ) : null}
    <ButtonIcon
      iconName={IconName.Close}
      onPress={onClose}
      accessibilityLabel="Close"
    />
  </Box>
);

interface PayoutRow {
  label: string;
  value: string;
  isHighlight?: boolean;
}

/**
 * The payout sheet, presented over the order sheet. It rides the same spring
 * on the way in and out, instead of the design-system sheet's 150ms linear
 * slide, which restarts once layout measures it.
 */
const PayoutDetailsSheet = ({
  isVisible,
  rows,
  onClose,
}: {
  isVisible: boolean;
  rows: PayoutRow[];
  onClose: () => void;
}) => {
  const tw = useTailwind();
  const { shouldAnimate } = usePrototypeMotion();
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const travel = useSharedValue(screenHeight);
  const [isPresent, setIsPresent] = useState(false);

  if (travel.value !== screenHeight) {
    travel.value = screenHeight;
  }
  // Mount on the same render the sheet opens, so the spring starts from rest
  // instead of catching up after the modal appears.
  if (isVisible && !isPresent) {
    setIsPresent(true);
  }

  useEffect(() => {
    if (!isVisible && !isPresent) {
      return undefined;
    }
    const next = isVisible ? 1 : 0;
    if (!shouldAnimate) {
      progress.value = next;
      if (!isVisible) {
        setIsPresent(false);
      }
      return undefined;
    }
    progress.value = withSpring(next, APPLE_SHEET_SPRING, (finished) => {
      'worklet';
      if (finished && next === 0) {
        scheduleOnRN(setIsPresent, false);
      }
    });
    return undefined;
  }, [isPresent, isVisible, progress, shouldAnimate]);

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * travel.value }],
  }));

  if (!isPresent) {
    return null;
  }

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={tw.style('flex-1')}>
        <Reanimated.View
          style={[
            StyleSheet.absoluteFill,
            tw.style('bg-overlay-default'),
            scrimStyle,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss payout details"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
        </Reanimated.View>
        <Reanimated.View
          style={[
            tw.style(
              'absolute inset-x-0 bottom-0 rounded-t-[32px] border border-b-0 border-muted bg-elevated1',
            ),
            { paddingBottom: Math.max(insets.bottom, 16) },
            sheetStyle,
          ]}
        >
          <Box twClassName="items-center p-1">
            <Box twClassName="h-1 w-10 rounded-sm bg-border-muted" />
          </Box>
          <Box twClassName="pb-2 pt-3">
            {rows.map((row) => (
              <Box
                key={row.label}
                twClassName="flex-row items-center justify-between p-4"
              >
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                >
                  {row.label}
                </Text>
                <Text
                  variant={TextVariant.BodyMd}
                  color={
                    row.isHighlight
                      ? TextColor.SuccessDefault
                      : TextColor.TextDefault
                  }
                >
                  {row.value}
                </Text>
              </Box>
            ))}
          </Box>
        </Reanimated.View>
      </View>
    </Modal>
  );
};

const useAmountEntry = (initial = '') => {
  const [amount, setAmount] = useState(initial);
  const onKeyPress = useCallback((key: string) => {
    setAmount((current) => {
      if (key === '.') {
        if (current.includes('.')) return current;
        return current ? `${current}.` : '0.';
      }
      const [whole, fraction] = current.split('.');
      if (fraction !== undefined && fraction.length >= 2) return current;
      if (fraction === undefined && whole.length >= MAX_DIGITS) return current;
      if (current === '0') return key;
      return `${current}${key}`;
    });
  }, []);
  const onDelete = useCallback(() => {
    setAmount((current) => current.slice(0, -1));
  }, []);
  return { amount, setAmount, onKeyPress, onDelete };
};

const OrderSheetContent = ({
  intent,
  close,
  dismissForTrade,
  presentation = 'sheet',
  initialAmount = '',
  onExpand,
}: {
  intent: ProtoOrderIntent;
  close: () => void;
  /** Removes the order UI at once, so the trade toast isn't drawn under it. */
  dismissForTrade: () => void;
  presentation?: 'sheet' | 'fullscreen';
  initialAmount?: string;
  onExpand?: (amount: string) => void;
}) => {
  const tw = useTailwind();
  const { shouldAnimate } = usePrototypeMotion();
  const { showInProgress, showSuccess } = usePrototypeTradeToasts();
  const { balance, placeOrder } = usePrototypeState();
  const isFullScreen = presentation === 'fullscreen';
  const { amount, setAmount, onKeyPress, onDelete } =
    useAmountEntry(initialAmount);
  const [selected, setSelected] = useState(intent.selected);
  const [alternate, setAlternate] = useState(intent.alternate);
  const [isKeypadOpen, setIsKeypadOpen] = useState(isFullScreen);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const keypadHeight = useSharedValue(0);
  const keypadProgress = useSharedValue(isFullScreen ? 1 : 0);
  const amountValue = Number(amount) || 0;
  const quote = quoteOrder(amountValue, selected.price);
  const showPayout = amountValue > 0;
  const payoutOpacity = useRef(new Animated.Value(showPayout ? 1 : 0)).current;
  const chanceOpacity = payoutOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  useEffect(() => {
    if (!shouldAnimate) {
      payoutOpacity.setValue(showPayout ? 1 : 0);
      return undefined;
    }
    const animation = Animated.timing(payoutOpacity, {
      toValue: showPayout ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [payoutOpacity, shouldAnimate, showPayout]);
  const isOverBalance = amountValue > balance;
  const canBuy = amountValue >= 1 && !isOverBalance;

  const setKeypadOpen = (isOpen: boolean) => {
    if (isFullScreen) return;
    setIsKeypadOpen(isOpen);
    const next = isOpen ? 1 : 0;
    keypadProgress.value = shouldAnimate
      ? withSpring(next, APPLE_SHEET_SPRING)
      : next;
  };

  const keypadClipStyle = useAnimatedStyle(() => ({
    height:
      keypadProgress.value * (keypadHeight.value || KEYPAD_HEIGHT_FALLBACK),
  }));

  const handleSwap = () => {
    if (!alternate) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelected(alternate);
    setAlternate(selected);
  };

  const handleQuick = (fraction: number) => {
    setAmount(String(Math.floor(balance * fraction * 100) / 100));
    setKeypadOpen(false);
  };

  const handleBuy = () => {
    const placedIntent = { ...intent, selected, alternate };
    const cost = amountValue;
    const payout = quote.payout;
    const label = selected.label;
    dismissForTrade();
    setTimeout(
      () => {
        showInProgress(
          strings('predict.order.placing_prediction'),
          `${formatUsd(cost)} on ${label}`,
        );
      },
      isFullScreen ? FULL_SCREEN_DISMISS_MS : 0,
    );
    runAfterTradeDelay(() => {
      placeOrder(placedIntent, cost);
      showSuccess(
        strings('predict.order.prediction_placed'),
        `${formatUsd(cost)} on ${label} · To win ${formatUsd(payout)}`,
      );
    });
  };

  const showContinue =
    !isFullScreen && isKeypadOpen && amountValue > 0 && !isOverBalance;
  const buyLabel = isOverBalance
    ? 'Not enough funds'
    : showContinue
      ? 'Continue'
      : 'Buy';

  const keypad = (
    <OrderKeypad
      onKeyPress={onKeyPress}
      onDelete={onDelete}
      hasFilledActionKeys
    />
  );

  return (
    <Box twClassName={isFullScreen ? 'flex-1' : undefined}>
      <SheetHeaderRow
        title={intent.eventTitle}
        option={selected}
        canSwap={Boolean(alternate)}
        onSwap={handleSwap}
        onClose={close}
        onExpand={onExpand ? () => onExpand(amount) : undefined}
      />
      <Box
        twClassName={`items-center gap-2 ${
          isFullScreen ? 'flex-1 justify-center' : 'py-8'
        }`}
      >
        <OrderAmountInput
          amount={amount}
          isActive={isKeypadOpen}
          onAmountPress={() => setKeypadOpen(!isKeypadOpen)}
        />
        <Box twClassName="h-6 items-center justify-center">
          <Animated.View
            style={[tw.style('absolute'), { opacity: chanceOpacity }]}
            accessibilityElementsHidden={showPayout}
            importantForAccessibility={
              showPayout ? 'no-hide-descendants' : 'auto'
            }
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              color={TextColor.TextAlternative}
            >
              {`${selected.price}% chance`}
            </Text>
          </Animated.View>
          <Animated.View
            style={{ opacity: payoutOpacity }}
            pointerEvents={showPayout ? 'auto' : 'none'}
            accessibilityElementsHidden={!showPayout}
            importantForAccessibility={
              showPayout ? 'auto' : 'no-hide-descendants'
            }
          >
            <Pressable
              onPress={() => setIsBreakdownOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Show payout details"
              hitSlop={8}
              style={({ pressed }) =>
                tw.style('flex-row items-center gap-1', pressed && 'opacity-50')
              }
            >
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
                {`To win ${formatUsd(showPayout ? quote.payout : 0)}`}
              </Text>
              <Icon
                name={IconName.Info}
                size={IconSize.Md}
                color={IconColor.IconAlternative}
              />
            </Pressable>
          </Animated.View>
        </Box>
      </Box>
      <Box twClassName="gap-4 px-4 pt-2">
        <QuickRow onSelect={handleQuick} />
        <Box twClassName="h-6 flex-row items-center justify-between">
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            Pay with
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Predictions balance, ${formatUsd(balance)}`}
            hitSlop={8}
            style={tw.style('flex-row items-center gap-1')}
          >
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              Predictions balance
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {formatUsd(balance)}
            </Text>
            <Icon
              name={IconName.ArrowDown}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
          </Pressable>
        </Box>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled={!showContinue && !canBuy}
          onPress={showContinue ? () => setKeypadOpen(false) : handleBuy}
        >
          {buyLabel}
        </Button>
      </Box>
      {isFullScreen ? (
        <Box twClassName="pt-2">{keypad}</Box>
      ) : (
        <Reanimated.View
          style={[tw.style('overflow-hidden'), keypadClipStyle]}
          pointerEvents={isKeypadOpen ? 'auto' : 'none'}
          accessibilityElementsHidden={!isKeypadOpen}
          importantForAccessibility={
            isKeypadOpen ? 'auto' : 'no-hide-descendants'
          }
        >
          <View
            style={tw.style('absolute inset-x-0 top-0')}
            onLayout={(event) => {
              keypadHeight.value = event.nativeEvent.layout.height;
            }}
          >
            {keypad}
          </View>
        </Reanimated.View>
      )}
      <PayoutDetailsSheet
        isVisible={isBreakdownOpen}
        onClose={() => setIsBreakdownOpen(false)}
        rows={[
          { label: 'Chance', value: `${selected.price}%` },
          { label: 'Shares', value: String(quote.contracts) },
          { label: 'Fees', value: formatUsd(quote.fee) },
          { label: 'Cost', value: formatUsd(quote.cost) },
          {
            label: 'To win',
            value: formatUsd(quote.payout),
            isHighlight: true,
          },
        ]}
      />
    </Box>
  );
};

/** Full-screen Quick Buy: same order content with the keypad open from the start. */
const FullScreenOrder = ({
  order,
  onClose,
}: {
  order: { intent: ProtoOrderIntent; amount: string } | null;
  onClose: () => void;
}) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={Boolean(order)}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <Box
        twClassName="flex-1 bg-default"
        style={{
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, 16),
        }}
      >
        {order ? (
          <OrderSheetContent
            key={`${order.intent.eventId}-${order.intent.selected.outcomeId}`}
            intent={order.intent}
            initialAmount={order.amount}
            presentation="fullscreen"
            close={onClose}
            dismissForTrade={onClose}
          />
        ) : null}
      </Box>
    </Modal>
  );
};

const CashOutSheetContent = ({
  close,
  onCashedOut,
}: {
  close: () => void;
  onCashedOut: (model: PositionShareModel) => void;
}) => {
  const { showInProgress, dismiss } = usePrototypeTradeToasts();
  const {
    cashOutPosition: position,
    cashOut,
    closeCashOut,
  } = usePrototypeState();
  const [fraction, setFraction] = useState(1);
  if (!position) return null;
  const contracts = Math.max(1, Math.round(position.contracts * fraction));
  const value = (contracts * position.currentPrice) / 100;

  return (
    <>
      <SheetHeaderRow
        title={position.eventTitle}
        option={{
          outcomeId: position.outcomeId,
          label: position.label,
          price: position.currentPrice,
          color: position.color,
          avatar: position.avatar,
        }}
        canSwap={false}
        onSwap={() => undefined}
        onClose={close}
      />
      <Box twClassName="items-center gap-1 py-6">
        <Text variant={TextVariant.DisplayMd}>{formatUsd(value)}</Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {`${contracts} of ${position.contracts} shares · ${position.currentPrice}% chance`}
        </Text>
      </Box>
      <Box twClassName="gap-4 px-4 pb-6">
        <QuickRow onSelect={setFraction} />
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={() => {
            const positionId = position.id;
            const soldFraction = fraction;
            const sold = Math.max(
              1,
              Math.round(position.contracts * soldFraction),
            );
            const cost = (sold * position.avgPrice) / 100;
            const proceeds = (sold * position.currentPrice) / 100;
            const shared: PositionShareModel = {
              label: position.label,
              eventTitle: position.eventTitle,
              color: position.color,
              avatar: position.avatar,
              cost,
              payout: proceeds,
              code: shareCode(position.eventId, position.avgPrice),
              contracts: sold,
              avgPrice: position.avgPrice,
            };
            closeCashOut();
            setTimeout(() => {
              showInProgress(
                strings('predict.order.cashing_out_loading'),
                `${shared.label} · ${formatUsd(proceeds)}`,
              );
            }, 0);
            runAfterTradeDelay(() => {
              cashOut(positionId, soldFraction);
              dismiss();
              onCashedOut(shared);
            });
          }}
        >
          {`Cash out ${formatUsd(value)}`}
        </Button>
      </Box>
    </>
  );
};

interface IntroItem {
  icon: IconName;
  label: string;
}

/** First visit: what Predictions is, before anyone is asked to sign up. */
const INTRO_ITEMS: IntroItem[] = [
  {
    icon: IconName.Trophy,
    label: 'Predict sports, crypto, politics, and more',
  },
  { icon: IconName.Cash, label: 'Cash out any time before the market closes' },
  {
    icon: IconName.ShieldLock,
    label: 'Regulated in the US, powered by Kalshi',
  },
];

/** Sign-up gate: shown when a signed-out user taps a price. */
const GATE_ITEMS: IntroItem[] = [
  { icon: IconName.SecurityTick, label: 'Quick security check' },
  { icon: IconName.UserCheck, label: 'Verify your identity with Kalshi' },
  { icon: IconName.Predictions, label: 'Place your prediction' },
];

const INTRO_STAGGER_MS = 40;
/** Short and critically damped, so each row settles in place with no bounce. */
const INTRO_ENTER_MS = 280;

const IntroContent = ({
  title,
  body,
  items,
  primaryLabel,
  close,
  onStart,
  onDismiss,
}: {
  title: string;
  body: string;
  items: IntroItem[];
  primaryLabel: string;
  close: () => void;
  onStart: () => void;
  onDismiss?: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const { shouldAnimate } = usePrototypeMotion();
  const enter = (index: number) =>
    shouldAnimate
      ? FadeInDown.delay(index * INTRO_STAGGER_MS)
          .springify(INTRO_ENTER_MS)
          .dampingRatio(1)
          .withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })
      : undefined;
  return (
    <Box twClassName="px-4">
      <Box twClassName="flex-row items-center justify-end pb-2 pt-1">
        <ButtonIcon
          iconName={IconName.Close}
          size={ButtonIconSize.Sm}
          onPress={close}
          accessibilityLabel="Close"
        />
      </Box>
      <Box twClassName="gap-6 pb-2">
        <Reanimated.View entering={enter(0)}>
          <Box twClassName="gap-3">
            <Box twClassName="flex-row items-center">
              <Image
                source={MM_FOX}
                accessibilityIgnoresInvertColors
                accessibilityLabel="MetaMask"
                resizeMode="contain"
                style={styles.foxLogo}
              />
              <Box
                twClassName="items-center justify-center rounded-full"
                style={styles.kalshiPill}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Bold}
                  style={{ color: PALETTE.kalshiInk }}
                >
                  Kalshi
                </Text>
              </Box>
            </Box>
            <Text variant={TextVariant.HeadingLg} fontWeight={FontWeight.Bold}>
              {title}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {body}
            </Text>
          </Box>
        </Reanimated.View>
        <Box twClassName="gap-4">
          {items.map((item, index) => (
            <Reanimated.View key={item.label} entering={enter(index + 1)}>
              <Box twClassName="flex-row items-center gap-3">
                <IconTile iconName={item.icon} size={40} />
                <Text variant={TextVariant.BodyMd} twClassName="min-w-0 flex-1">
                  {item.label}
                </Text>
              </Box>
            </Reanimated.View>
          ))}
        </Box>
        <Box
          twClassName="gap-2"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={() => {
              onStart();
              close();
            }}
          >
            {primaryLabel}
          </Button>
          {onDismiss ? (
            <Button
              variant={ButtonVariant.Tertiary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={() => {
                onDismiss();
                close();
              }}
            >
              Not now
            </Button>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
};

const KYC_STEPS = [
  'Security check',
  'Verify your identity',
  'Connect to Kalshi',
] as const;

const KycModal = () => {
  const { isKycVisible, closeKyc, completeKyc } = usePrototypeState();
  const [completedSteps, setCompletedSteps] = useState(-1);
  const isRunning = completedSteps >= 0;

  useEffect(() => {
    if (!isKycVisible) setCompletedSteps(-1);
  }, [isKycVisible]);

  useEffect(() => {
    if (!isRunning) return undefined;
    if (completedSteps >= KYC_STEPS.length) {
      const id = setTimeout(completeKyc, 400);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCompletedSteps((step) => step + 1);
    }, 750);
    return () => clearTimeout(id);
  }, [completedSteps, completeKyc, isRunning]);

  return (
    <Modal
      visible={isKycVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={closeKyc}
    >
      <Box twClassName="flex-1 bg-default">
        <HeaderStandard
          includesTopInset
          title="Verify identity"
          onClose={closeKyc}
        />
        <Box twClassName="flex-1 px-4 pt-4 gap-6">
          <Box twClassName="h-48 items-center justify-center rounded-2xl bg-muted">
            <Text
              variant={TextVariant.HeadingSm}
              color={TextColor.TextAlternative}
            >
              Universal KYC goes here
            </Text>
          </Box>
          <Box twClassName="gap-4">
            {KYC_STEPS.map((step, index) => {
              const isDone = completedSteps > index;
              const isActive = completedSteps === index;
              return (
                <Box key={step} twClassName="flex-row items-center gap-3">
                  <Box
                    twClassName={`h-8 w-8 items-center justify-center rounded-full ${
                      isDone ? 'bg-success-default' : 'bg-muted'
                    }`}
                  >
                    {isDone ? (
                      <Icon
                        name={IconName.Check}
                        size={IconSize.Sm}
                        color={IconColor.IconInverse}
                      />
                    ) : (
                      <Text variant={TextVariant.BodySm}>{index + 1}</Text>
                    )}
                  </Box>
                  <Text
                    variant={TextVariant.BodyMd}
                    color={
                      isDone || isActive
                        ? TextColor.TextDefault
                        : TextColor.TextAlternative
                    }
                  >
                    {isActive ? `${step}…` : step}
                  </Text>
                </Box>
              );
            })}
          </Box>
        </Box>
        <Box twClassName="px-4 pb-10">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isLoading={isRunning}
            onPress={() => setCompletedSteps(0)}
          >
            Simulate verification
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

const ConnectedContent = ({ close }: { close: () => void }) => (
  <Box twClassName="gap-3 px-4 pb-6 pt-2">
    <Box twClassName="h-10 w-10 items-center justify-center rounded-full bg-success-muted">
      <Icon
        name={IconName.Check}
        size={IconSize.Md}
        color={IconColor.SuccessDefault}
      />
    </Box>
    <Text variant={TextVariant.HeadingMd}>Account connected</Text>
    <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
      {"You're ready to trade predictions."}
    </Text>
    <Box twClassName="pt-2">
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={close}
      >
        Continue
      </Button>
    </Box>
  </Box>
);

const FUND_AMOUNTS = [25, 50, 100, 250] as const;

const FundsContent = ({ close }: { close: () => void }) => {
  const tw = useTailwind();
  const { fundsMode, balance, moveFunds } = usePrototypeState();
  const [selected, setSelected] = useState<number>(50);
  const [isLoading, setIsLoading] = useState(false);
  const mode = fundsMode ?? 'add';
  return (
    <Box twClassName="gap-4 px-4 pb-6">
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {`Predictions balance ${formatUsd(balance)}`}
      </Text>
      <Box twClassName="flex-row gap-2">
        {FUND_AMOUNTS.map((value) => (
          <Pressable
            key={value}
            onPress={() => setSelected(value)}
            style={tw.style(
              'h-12 flex-1 items-center justify-center rounded-xl',
              selected === value ? 'bg-icon-default' : 'bg-muted',
            )}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              twClassName={selected === value ? 'text-icon-inverse' : undefined}
            >
              {`$${value}`}
            </Text>
          </Pressable>
        ))}
      </Box>
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        isFullWidth
        isLoading={isLoading}
        isDisabled={mode === 'withdraw' && selected > balance}
        onPress={() => {
          setIsLoading(true);
          setTimeout(() => {
            moveFunds(mode, selected);
            close();
          }, 800);
        }}
      >
        {mode === 'add' ? `Add $${selected}` : `Withdraw $${selected}`}
      </Button>
    </Box>
  );
};

const RulesContent = () => {
  const tw = useTailwind();
  const { rules } = usePrototypeState();
  if (!rules) return null;
  const blocks = [
    { heading: 'How this market resolves', body: rules.body },
    {
      heading: 'Source',
      body: 'Official league result, once the game is final and confirmed.',
    },
    {
      heading: 'If the game is not completed',
      body: 'If the game is postponed, suspended, or canceled, the market resolves according to the settlement rules for this category.',
    },
  ];
  return (
    <ScrollView contentContainerStyle={tw.style('px-4 pb-8')}>
      <Box twClassName="gap-4">
        <Text variant={TextVariant.HeadingSm}>{rules.title}</Text>
        {blocks.map((block) => (
          <Box key={block.heading} twClassName="gap-1">
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
              {block.heading}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {block.body}
            </Text>
          </Box>
        ))}
      </Box>
    </ScrollView>
  );
};

/** Hosts every prototype sheet above whichever screen is focused. */
export const PrototypeSheetHost = () => {
  const state = usePrototypeState();
  const { orderIntent, closeOrder, closeGetStarted, closeIntro, startKyc } =
    state;
  const [closedShare, setClosedShare] = useState<PositionShareModel | null>(
    null,
  );
  const [fullScreenOrder, setFullScreenOrder] = useState<{
    intent: ProtoOrderIntent;
    amount: string;
  } | null>(null);
  const shouldStartKycRef = useRef(false);
  const startKycAfterClose = useCallback(() => {
    if (shouldStartKycRef.current) {
      shouldStartKycRef.current = false;
      startKyc();
    }
  }, [startKyc]);
  const handleGetStartedClosed = useCallback(() => {
    closeGetStarted();
    startKycAfterClose();
  }, [closeGetStarted, startKycAfterClose]);
  const handleIntroClosed = useCallback(() => {
    closeIntro();
    startKycAfterClose();
  }, [closeIntro, startKycAfterClose]);
  const markKycStart = useCallback(() => {
    shouldStartKycRef.current = true;
  }, []);
  const handleExpand = useCallback(
    (intent: ProtoOrderIntent, amount: string) => {
      closeOrder();
      setTimeout(
        () => setFullScreenOrder({ intent, amount }),
        MODAL_HANDOFF_MS,
      );
    },
    [closeOrder],
  );
  return (
    <>
      <ProtoSheet isVisible={Boolean(orderIntent)} onClose={closeOrder}>
        {(close) =>
          orderIntent ? (
            <OrderSheetContent
              key={`${orderIntent.eventId}-${orderIntent.selected.outcomeId}`}
              intent={orderIntent}
              close={close}
              dismissForTrade={closeOrder}
              onExpand={(amount) => handleExpand(orderIntent, amount)}
            />
          ) : null
        }
      </ProtoSheet>
      <FullScreenOrder
        order={fullScreenOrder}
        onClose={() => setFullScreenOrder(null)}
      />
      <ProtoSheet
        isVisible={Boolean(state.cashOutPosition)}
        onClose={state.closeCashOut}
      >
        {(close) => (
          <CashOutSheetContent close={close} onCashedOut={setClosedShare} />
        )}
      </ProtoSheet>
      <Modal
        visible={Boolean(closedShare)}
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => setClosedShare(null)}
      >
        {closedShare ? (
          <PositionOpened
            model={closedShare}
            onDone={() => setClosedShare(null)}
          />
        ) : null}
      </Modal>
      <ProtoSheet isVisible={state.isIntroVisible} onClose={handleIntroClosed}>
        {(close) => (
          <IntroContent
            title="Predict what happens next"
            body="Buy a side on real-world events. If you're right, you win."
            items={INTRO_ITEMS}
            primaryLabel="Get started"
            close={close}
            onStart={markKycStart}
            onDismiss={() => undefined}
          />
        )}
      </ProtoSheet>
      <ProtoSheet
        isVisible={state.isGetStartedVisible}
        onClose={handleGetStartedClosed}
      >
        {(close) => (
          <IntroContent
            title="A few quick steps to trade predictions"
            body="Set up takes about two minutes. Your prediction will be ready when you're done."
            items={GATE_ITEMS}
            primaryLabel="Start"
            close={close}
            onStart={markKycStart}
          />
        )}
      </ProtoSheet>
      <KycModal />
      <ProtoSheet
        isVisible={state.isConnectedVisible}
        onClose={state.finishConnect}
      >
        {(close) => <ConnectedContent close={close} />}
      </ProtoSheet>
      <ProtoSheet
        isVisible={Boolean(state.fundsMode)}
        onClose={state.closeFunds}
        title={state.fundsMode === 'withdraw' ? 'Withdraw' : 'Add funds'}
      >
        {(close) => <FundsContent close={close} />}
      </ProtoSheet>
      <ProtoSheet
        isVisible={Boolean(state.comments)}
        onClose={state.closeComments}
      >
        {(close) =>
          state.comments ? (
            <CommentsSheetContent
              key={state.comments.eventId}
              target={state.comments}
              close={close}
            />
          ) : null
        }
      </ProtoSheet>
      <ProtoSheet
        isVisible={Boolean(state.rules)}
        onClose={state.closeRules}
        title="Rules"
      >
        <RulesContent />
      </ProtoSheet>
    </>
  );
};
