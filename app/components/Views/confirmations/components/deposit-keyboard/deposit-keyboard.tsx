import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  InteractionManager,
  Keyboard,
  type KeyboardEvent,
  LayoutAnimation,
  Platform,
  Pressable,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import KeypadComponent, { KeypadChangeData } from '../../../../Base/Keypad';
import useCurrency from '../../../../Base/Keypad/useCurrency';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './deposit-keyboard.styles';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box as DesignSystemBox,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonBaseSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { Box } from '../../../../UI/Box/Box';
import { FlexDirection, JustifyContent } from '../../../../UI/Box/box.types';
import { strings } from '../../../../../../locales/i18n';
import { PERPS_CURRENCY } from '../../constants/perps';
import BoxGlass from '../../../../../component-library/components-temp/BoxGlass';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import Keypad from '../../../../Base/Keypad/components';
import { useNetworkTier } from '../../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../../util/deviceCapability';
import { formatAmountForDisplay } from '../../utils/transaction-pay';
import { BOTTOM_BLOCK_PADDING } from '../info/custom-amount-info/custom-amount-info.styles';

const NATIVE_INPUT_MAX_DECIMALS = 2;
/** How far a pressed percentage grows past its padding to cover the dividers. */
const PERCENTAGE_PRESS_BLEED = 6;
export const DEPOSIT_NATIVE_INPUT_TEST_ID = 'deposit-keyboard-native-input';
export const DEPOSIT_KEYBOARD_FRAME_TEST_ID = 'deposit-keyboard-frame';

/** iOS keyboard show and hide. Used when no system keyboard event is available. */
export const KEYBOARD_LAYOUT_ANIMATION = {
  duration: 250,
  create: {
    type: LayoutAnimation.Types.keyboard,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.keyboard,
  },
  delete: {
    type: LayoutAnimation.Types.keyboard,
    property: LayoutAnimation.Properties.opacity,
  },
};

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Visible keyboard overlap. During a drag, `height` stays constant while
 * `screenY` follows the finger, so the overlap is how far the frame still
 * covers the window.
 */
export function getKeyboardOverlap(
  event: KeyboardEvent,
  windowHeight: number,
): number {
  const { height, screenY } = event.endCoordinates;
  const coveringHeight = windowHeight - screenY;

  if (coveringHeight <= 0) {
    return 0;
  }

  return Math.min(height, coveringHeight);
}

/** Runs the next layout change on the keyboard event's duration and curve. */
export function configureKeyboardLayoutAnimation(event: KeyboardEvent): void {
  if (event.duration <= 0) {
    return;
  }

  const updateType = (() => {
    switch (event.easing) {
      case 'easeIn':
        return LayoutAnimation.Types.easeIn;
      case 'easeInEaseOut':
        return LayoutAnimation.Types.easeInEaseOut;
      case 'easeOut':
        return LayoutAnimation.Types.easeOut;
      case 'linear':
        return LayoutAnimation.Types.linear;
      default:
        return LayoutAnimation.Types.keyboard;
    }
  })();

  LayoutAnimation.configureNext({
    duration: event.duration,
    update: {
      type: updateType,
    },
  });
}

/**
 * Converts text from the React Native decimal pad into the value the custom
 * keypad emits: digits, one decimal separator, at most two decimals, and no
 * leading zeros.
 */
export function getNativeKeypadValue(
  nextText: string,
  decimalSeparator: string,
): string {
  const cleaned = nextText.replace(/[^\d.,]/gu, '');
  const separatorIndex = cleaned.search(/[.,]/u);

  if (separatorIndex === -1) {
    return cleaned.replace(/^0+(?=\d)/u, '');
  }

  const integerPart =
    cleaned.slice(0, separatorIndex).replace(/^0+(?=\d)/u, '') || '0';
  const fractionPart = cleaned
    .slice(separatorIndex + 1)
    .replace(/[.,]/gu, '')
    .slice(0, NATIVE_INPUT_MAX_DECIMALS);

  return `${integerPart}${decimalSeparator}${fractionPart}`;
}

const PERCENTAGE_BUTTONS = [
  {
    label: '10%',
    value: 10,
  },
  {
    label: '25%',
    value: 25,
  },
  {
    label: '50%',
    value: 50,
  },
  {
    label: '90%',
    value: 90,
  },
];

const MAX_BUTTON = {
  label: 'Max',
  value: 100,
};

export interface DepositKeyboardProps {
  doneLabel?: string;
  hasInput?: boolean;
  hasMax?: boolean;
  hidePercentageButtons?: boolean;
  isDoneDisabled?: boolean;
  onChange: (value: string) => void;
  onPercentagePress: (percentage: number) => void;
  onDonePress: () => void;
  /**
   * Shows the React Native decimal pad instead of KeypadComponent.
   */
  useNativeKeyboard?: boolean;
  /**
   * Increments when the amount is tapped. The decimal pad opens again while
   * the amount cursor is blinking.
   */
  focusRequest?: number;
  /**
   * Set when amount entry is dismissed. Stops the decimal pad from reopening
   * while the keypad collapses.
   */
  nativeKeypadDismissedRef?: { current: boolean };
  /**
   * The decimal pad started hiding after the user dragged it or tapped
   * outside. The cursor stops here, at the start of the slide.
   */
  onNativeKeyboardWillHide?: () => void;
  /**
   * The decimal pad finished hiding because the user dragged it down.
   * Programmatic dismiss does not call this.
   */
  onNativeKeyboardDidHide?: () => void;
  value: string;
}

export const DepositKeyboard = memo(
  ({
    doneLabel,
    hasInput,
    hasMax,
    hidePercentageButtons,
    isDoneDisabled,
    onChange,
    onDonePress,
    focusRequest = 0,
    nativeKeypadDismissedRef,
    onNativeKeyboardDidHide,
    onNativeKeyboardWillHide,
    onPercentagePress,
    useNativeKeyboard = false,
    value,
  }: DepositKeyboardProps) => {
    const currentCurrency = PERPS_CURRENCY;
    const { styles } = useStyles(styleSheet, {});
    const valueString = formatAmountForDisplay(value.toString());
    const { decimalSeparator } = useCurrency(currentCurrency, 2);
    const nativeInputRef = useRef<TextInput>(null);
    const isDismissingRef = useRef(false);
    const hasShownRef = useRef(false);
    const onNativeKeyboardWillHideRef = useRef(onNativeKeyboardWillHide);
    const onNativeKeyboardDidHideRef = useRef(onNativeKeyboardDidHide);
    onNativeKeyboardWillHideRef.current = onNativeKeyboardWillHide;
    onNativeKeyboardDidHideRef.current = onNativeKeyboardDidHide;
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const { bottom: safeAreaBottom } = useSafeAreaInsets();
    const nativeKeyboardPadding =
      useNativeKeyboard && keyboardHeight > 0
        ? Math.max(0, keyboardHeight - safeAreaBottom - BOTTOM_BLOCK_PADDING)
        : 0;

    useEffect(() => {
      if (!useNativeKeyboard) {
        return undefined;
      }

      // The amount cursor is on screen whenever this keypad is mounted. Focus
      // after the confirmation transition, and again each time the amount is
      // tapped, or iOS never shows the decimal pad.
      isDismissingRef.current = false;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const interaction = InteractionManager.runAfterInteractions(() => {
        timeoutId = setTimeout(() => {
          nativeInputRef.current?.focus();
        }, 50);
      });

      return () => {
        interaction?.cancel?.();
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
        }
      };
    }, [focusRequest, useNativeKeyboard]);

    useEffect(() => {
      if (!useNativeKeyboard) {
        return undefined;
      }

      const applyKeyboardFrame = (event: KeyboardEvent) => {
        // willShow / willHide carry the system duration and curve, so the
        // amount moves with the decimal pad instead of jumping after it.
        // A drag reports duration 0 and is applied on that frame.
        configureKeyboardLayoutAnimation(event);
        setKeyboardHeight(
          getKeyboardOverlap(event, Dimensions.get('window').height),
        );
      };

      const showEvent =
        Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
      const subscriptions = [
        Keyboard.addListener(showEvent, (event) => {
          hasShownRef.current = true;
          applyKeyboardFrame(event);
        }),
      ];

      if (Platform.OS === 'ios') {
        subscriptions.push(
          Keyboard.addListener('keyboardWillChangeFrame', (event) => {
            applyKeyboardFrame(event);
          }),
          Keyboard.addListener('keyboardWillHide', (event) => {
            applyKeyboardFrame(event);
            if (
              hasShownRef.current &&
              !isDismissingRef.current &&
              !nativeKeypadDismissedRef?.current
            ) {
              onNativeKeyboardWillHideRef.current?.();
            }
          }),
          // Settle on the final frame without starting a second animation.
          Keyboard.addListener('keyboardDidShow', (event) => {
            hasShownRef.current = true;
            setKeyboardHeight(
              getKeyboardOverlap(event, Dimensions.get('window').height),
            );
          }),
        );
      }

      subscriptions.push(
        Keyboard.addListener('keyboardDidHide', () => {
          setKeyboardHeight(0);
          const wasShown = hasShownRef.current;
          hasShownRef.current = false;
          // iOS can hide the pad before the first show. Bring it back only
          // for that race. A hide after the pad was visible is the user
          // dragging it away or tapping outside, and it stays down.
          if (
            !wasShown &&
            !isDismissingRef.current &&
            !nativeKeypadDismissedRef?.current
          ) {
            nativeInputRef.current?.focus();
            return;
          }
          if (
            wasShown &&
            !isDismissingRef.current &&
            !nativeKeypadDismissedRef?.current
          ) {
            onNativeKeyboardDidHideRef.current?.();
          }
        }),
      );

      return () => {
        isDismissingRef.current = true;
        Keyboard.dismiss();
        subscriptions.forEach((subscription) => subscription?.remove());
      };
    }, [nativeKeypadDismissedRef, useNativeKeyboard]);

    const handleChange = useCallback(
      (data: KeypadChangeData) => {
        onChange(data.value);
      },
      [onChange],
    );

    const handleNativeChange = useCallback(
      (text: string) => {
        onChange(getNativeKeypadValue(text, decimalSeparator ?? '.'));
      },
      [decimalSeparator, onChange],
    );

    const handleDonePress = useCallback(() => {
      if (useNativeKeyboard) {
        isDismissingRef.current = true;
        Keyboard.dismiss();
      }
      onDonePress();
    }, [onDonePress, useNativeKeyboard]);

    const handlePercentagePress = useCallback(
      (percentage: number) => {
        onPercentagePress(percentage);
      },
      [onPercentagePress],
    );

    const hardware = getHardwareTier();
    const network = useNetworkTier();
    const isLowHardware = hardware === 'LOW' && network !== null;
    const isGlass = network !== 'NONE' && !isLowHardware;

    const buttons = useMemo(() => {
      const newButtons = [...PERCENTAGE_BUTTONS];

      if (hasMax) {
        newButtons.pop();
        newButtons.push(MAX_BUTTON);
      }

      return newButtons;
    }, [hasMax]);

    const showContinue = Boolean(hasInput);
    const showContinueRef = useRef(showContinue);
    if (showContinueRef.current !== showContinue) {
      showContinueRef.current = showContinue;
      // Configure before this render commits so the percentage bar and
      // Continue crossfade instead of swapping in one frame.
      LayoutAnimation.configureNext(KEYBOARD_LAYOUT_ANIMATION);
    }

    return (
      <View
        testID={DEPOSIT_KEYBOARD_FRAME_TEST_ID}
        style={
          useNativeKeyboard
            ? { paddingBottom: nativeKeyboardPadding }
            : undefined
        }
      >
        <Box
          testID="deposit-keyboard"
          flexDirection={FlexDirection.Row}
          justifyContent={JustifyContent.spaceBetween}
          gap={10}
          style={styles.controls}
        >
          {!hasInput && !hidePercentageButtons && (
            <DepositPercentageBar
              buttons={buttons}
              isGlass={isGlass}
              onPress={handlePercentagePress}
            />
          )}
          {hasInput && (
            <View style={styles.continueButton}>
              <Button
                testID="deposit-keyboard-done-button"
                onPress={handleDonePress}
                isDisabled={isDoneDisabled}
                size={ButtonBaseSize.Lg}
                isFullWidth
                variant={ButtonVariant.Primary}
                twClassName="mb-3"
              >
                {doneLabel ?? strings('confirm.edit_amount_done')}
              </Button>
            </View>
          )}
        </Box>
        {useNativeKeyboard ? (
          <TextInput
            ref={nativeInputRef}
            testID={DEPOSIT_NATIVE_INPUT_TEST_ID}
            value={valueString}
            onChangeText={handleNativeChange}
            keyboardType="decimal-pad"
            autoFocus
            caretHidden
            pointerEvents="none"
            showSoftInputOnFocus
            style={styles.nativeInput}
          />
        ) : (
          <KeypadComponent
            value={valueString}
            onChange={handleChange}
            currency={currentCurrency}
            decimals={2}
          />
        )}
      </View>
    );
  },
);

function DepositPercentageBar({
  buttons,
  isGlass,
  onPress,
}: {
  buttons: { label: string; value: number }[];
  isGlass: boolean;
  onPress: (percentage: number) => void;
}) {
  const tw = useTailwind();
  const { styles } = useStyles(styleSheet, {});
  const [pressedValue, setPressedValue] = useState<number | null>(null);

  return (
    <DesignSystemBox twClassName="mb-3 h-12 flex-1 overflow-hidden rounded-full">
      {/* The glass surface takes the tap on iOS, so it only draws and the
          segments above it receive the press. */}
      <View pointerEvents="none" style={tw.style('absolute inset-0')}>
        <BoxGlass
          radiusClassName="rounded-full"
          isGlass={isGlass}
          containerStyle={tw.style('h-full w-full')}
          style={tw.style('h-full w-full')}
        />
      </View>
      <DesignSystemBox
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="h-12 w-full"
      >
        {buttons.map((button, index) => {
          const isPressed = pressedValue === button.value;
          const isFirst = index === 0;
          const isLast = index === buttons.length - 1;
          const dividerTouchesPress =
            pressedValue === button.value ||
            pressedValue === buttons[index - 1]?.value;
          // The end segments keep their outer inset. Only the side that
          // meets a divider grows over it.
          const pressedMargin = isFirst
            ? { marginRight: -PERCENTAGE_PRESS_BLEED }
            : isLast
              ? { marginLeft: -PERCENTAGE_PRESS_BLEED }
              : { marginHorizontal: -PERCENTAGE_PRESS_BLEED };

          return (
            <React.Fragment key={button.value}>
              {index > 0 && (
                <View
                  testID={`deposit-keyboard-percentage-divider-${button.value}`}
                  style={[
                    styles.percentageDivider,
                    dividerTouchesPress && styles.percentageDividerHidden,
                  ]}
                />
              )}
              <Pressable
                accessibilityRole="button"
                onPress={() => onPress(button.value)}
                onPressIn={() => setPressedValue(button.value)}
                onPressOut={() =>
                  setPressedValue((current) =>
                    current === button.value ? null : current,
                  )
                }
                style={[
                  tw.style('h-full flex-1 p-1'),
                  isPressed && styles.percentageButtonPressed,
                ]}
                testID={`deposit-keyboard-percentage-${button.value}`}
              >
                <View
                  testID={`deposit-keyboard-percentage-highlight-${button.value}`}
                  style={[
                    tw.style(
                      'h-full items-center justify-center rounded-full',
                      // A fixed width ignores the negative margin, so the
                      // pressed pill stretches wider instead.
                      isPressed ? 'bg-pressed' : 'w-full',
                    ),
                    isPressed && pressedMargin,
                  ]}
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                  >
                    {button.label}
                  </Text>
                </View>
              </Pressable>
            </React.Fragment>
          );
        })}
      </DesignSystemBox>
    </DesignSystemBox>
  );
}

export function DepositKeyboardSkeleton() {
  return (
    <Keypad>
      <DepositKeyboardSkeletonRow count={4} />
      <DepositKeyboardSkeletonRow />
      <DepositKeyboardSkeletonRow />
      <DepositKeyboardSkeletonRow />
      <DepositKeyboardSkeletonRow />
    </Keypad>
  );
}

function DepositKeyboardSkeletonRow({ count = 3 }) {
  const { styles } = useStyles(styleSheet, {});

  return (
    <Keypad.Row>
      {[...Array(count)].map((_, index) => (
        <Skeleton key={index} style={styles.skeletonButton} />
      ))}
    </Keypad.Row>
  );
}
