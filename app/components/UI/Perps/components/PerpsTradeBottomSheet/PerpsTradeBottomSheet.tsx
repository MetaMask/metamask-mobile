import {
  BottomSheet,
  Box,
  Text,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BackHandler, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  type EntryExitAnimationFunction,
  type SharedValue,
  withTiming,
} from 'react-native-reanimated';
import { AnimationDuration } from '@metamask/design-tokens';
import { PerpsTradeSheetSelectorsIDs } from '../../Perps.testIds';

export type PerpsTradeSheetScreen = 'trade' | 'leverage' | 'tpsl' | 'settings';

type ScreenDirection = 1 | -1;
const SCREEN_SLIDE_OFFSET = 24;

const makeScreenTransitions = (
  direction: SharedValue<ScreenDirection>,
): {
  entering: EntryExitAnimationFunction;
  exiting: EntryExitAnimationFunction;
} => {
  const entering: EntryExitAnimationFunction = () => {
    'worklet';
    return {
      initialValues: {
        opacity: 0,
        transform: [{ translateX: direction.value * SCREEN_SLIDE_OFFSET }],
      },
      animations: {
        opacity: withTiming(1, { duration: AnimationDuration.Fast }),
        transform: [
          {
            translateX: withTiming(0, {
              duration: AnimationDuration.Fast,
            }),
          },
        ],
      },
    };
  };

  const exiting: EntryExitAnimationFunction = () => {
    'worklet';
    return {
      initialValues: { opacity: 1, transform: [{ translateX: 0 }] },
      animations: {
        opacity: withTiming(0, { duration: AnimationDuration.Fast }),
        transform: [
          {
            translateX: withTiming(-direction.value * SCREEN_SLIDE_OFFSET, {
              duration: AnimationDuration.Fast,
            }),
          },
        ],
      },
    };
  };

  return { entering, exiting };
};

export interface PerpsTradeSheetContextValue<
  Screen extends string = PerpsTradeSheetScreen,
> {
  activeScreen: Screen;
  navigateTo: (screen: Screen) => void;
  goBack: () => void;
  close: () => void;
  title?: string;
  banner?: React.ReactNode;
}

const PerpsTradeSheetContext =
  createContext<PerpsTradeSheetContextValue<string> | null>(null);

export const usePerpsTradeSheet = <
  Screen extends string = PerpsTradeSheetScreen,
>(): PerpsTradeSheetContextValue<Screen> => {
  const context = useContext(PerpsTradeSheetContext);
  if (!context) {
    throw new Error(
      'usePerpsTradeSheet must be used within PerpsTradeBottomSheet',
    );
  }
  return context as unknown as PerpsTradeSheetContextValue<Screen>;
};

export const PerpsTradeSheetTitleBanner: React.FC<{
  title?: string;
  banner?: React.ReactNode;
}> = ({ title, banner }) => {
  if (!title && !banner) {
    return null;
  }

  return (
    <Box accessible={false} paddingHorizontal={4} paddingBottom={3} gap={3}>
      {title ? (
        <Text variant={TextVariant.HeadingSm} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {banner}
    </Box>
  );
};

export interface PerpsTradeBottomSheetProps<Screen extends string> {
  onClose: () => void;
  onInteractive?: () => void;
  onCancelBeforeInteractive?: () => void;
  screens: Record<Screen, React.ReactNode>;
  rootScreen: Screen;
  screenDepth: Record<Screen, number>;
  /** Optional heading shown on the root screen. */
  title?: string;
  /** Optional banner rendered directly below `title` on the root screen. */
  banner?: React.ReactNode;
}

const PerpsTradeBottomSheet = <Screen extends string>({
  onClose,
  onInteractive,
  onCancelBeforeInteractive,
  title,
  banner,
  screens,
  rootScreen,
  screenDepth,
}: PerpsTradeBottomSheetProps<Screen>) => {
  const tw = useTailwind();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const hasClosedRef = useRef(false);
  const isClosingRef = useRef(false);
  const hasReportedInteractiveRef = useRef(false);
  const [isClosing, setIsClosing] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [rootHeight, setRootHeight] = useState<number | null>(null);
  const [activeScreen, setActiveScreen] = useState<Screen>(rootScreen);
  const direction = useSharedValue<ScreenDirection>(1);
  const { entering, exiting } = useMemo(
    () => makeScreenTransitions(direction),
    [direction],
  );

  const navigateTo = useCallback(
    (next: Screen) => {
      setHasNavigated(true);
      setActiveScreen((current) => {
        direction.value = screenDepth[next] >= screenDepth[current] ? 1 : -1;
        return next;
      });
    },
    [direction, screenDepth],
  );

  const goBack = useCallback(
    () => navigateTo(rootScreen),
    [navigateTo, rootScreen],
  );

  useEffect(() => {
    if (activeScreen === rootScreen) {
      return;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        goBack();
        return true;
      },
    );
    return () => subscription.remove();
  }, [activeScreen, goBack, rootScreen]);

  const handleContentLayout = useCallback(
    ({ nativeEvent }: LayoutChangeEvent) => {
      if (activeScreen === rootScreen && nativeEvent.layout.height > 0) {
        setRootHeight(nativeEvent.layout.height);
        if (!hasReportedInteractiveRef.current) {
          hasReportedInteractiveRef.current = true;
          onInteractive?.();
        }
      }
    },
    [activeScreen, onInteractive, rootScreen],
  );
  const isHeightLocked = activeScreen !== rootScreen && rootHeight !== null;

  const reportCancelBeforeInteractive = useCallback(() => {
    if (!hasReportedInteractiveRef.current) {
      hasReportedInteractiveRef.current = true;
      onCancelBeforeInteractive?.();
    }
  }, [onCancelBeforeInteractive]);

  useEffect(
    () => () => {
      reportCancelBeforeInteractive();
    },
    [reportCancelBeforeInteractive],
  );

  const handleClose = useCallback(() => {
    if (hasClosedRef.current) {
      return;
    }
    hasClosedRef.current = true;
    reportCancelBeforeInteractive();
    onClose();
  }, [onClose, reportCancelBeforeInteractive]);

  const close = useCallback(() => {
    if (isClosingRef.current || hasClosedRef.current) {
      return;
    }
    isClosingRef.current = true;
    setIsClosing(true);
    const sheet = bottomSheetRef.current;
    if (sheet?.onCloseBottomSheet) {
      // BottomSheet invokes its own onClose prop after the exit animation.
      // Passing handleClose as a callback would invoke it twice.
      sheet.onCloseBottomSheet();
    } else {
      handleClose();
    }
  }, [handleClose]);

  const contextValue = useMemo(
    () => ({ activeScreen, navigateTo, goBack, close, title, banner }),
    [activeScreen, banner, close, goBack, navigateTo, title],
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      onClose={handleClose}
      testID={PerpsTradeSheetSelectorsIDs.SHEET}
    >
      <PerpsTradeSheetContext.Provider
        value={contextValue as unknown as PerpsTradeSheetContextValue<string>}
      >
        <Box
          accessible={false}
          testID={PerpsTradeSheetSelectorsIDs.CONTENT}
          onLayout={handleContentLayout}
          twClassName="overflow-hidden"
          style={isHeightLocked ? { height: rootHeight } : undefined}
        >
          <Animated.View
            key={activeScreen}
            entering={hasNavigated ? entering : undefined}
            exiting={isClosing ? undefined : exiting}
            style={tw.style('w-full', isHeightLocked && 'flex-1')}
          >
            {screens[activeScreen]}
          </Animated.View>
        </Box>
      </PerpsTradeSheetContext.Provider>
    </BottomSheet>
  );
};

export default PerpsTradeBottomSheet;
