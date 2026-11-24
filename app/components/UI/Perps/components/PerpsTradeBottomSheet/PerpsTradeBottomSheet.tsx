import {
  BottomSheet,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
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
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigation } from '@react-navigation/native';
import { BackHandler, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  type EntryExitAnimationFunction,
  type SharedValue,
  withTiming,
} from 'react-native-reanimated';
import { AnimationDuration } from '@metamask/design-tokens';
import { PerpsTradeSheetSelectorsIDs } from '../../Perps.testIds';

export type PerpsTradeSheetScreen =
  | 'trade'
  | 'leverage'
  | 'tpsl'
  | 'payWith'
  | 'marginInfo'
  | 'liquidationInfo';

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

interface PerpsTradeSheetFrameHandlers {
  onOpen?: () => void;
  onClose: () => void;
}

interface PerpsTradeSheetFrameValue {
  sheetRef: React.RefObject<BottomSheetRef | null>;
  register: (handlers: PerpsTradeSheetFrameHandlers) => () => void;
}

const PerpsTradeSheetFrameContext =
  createContext<PerpsTradeSheetFrameValue | null>(null);

// Height of the last trade content laid out, so the placeholder of the next
// open matches it and the sheet does not jump when the content replaces it.
let lastRootHeight: number | undefined;
const DEFAULT_PLACEHOLDER_HEIGHT = 600;

/**
 * Sheet frame (overlay, dialog, close handling) mounted ahead of the trade
 * content. The slide-in starts as soon as the frame lays out; a
 * `PerpsTradeBottomSheet` rendered inside it later uses this frame instead of
 * its own and takes over the open and close callbacks.
 */
export const PerpsTradeSheetFrame: React.FC<{
  /** Called when the sheet is dismissed before the trade content mounted. */
  onCloseBeforeContent: () => void;
  children: React.ReactNode;
}> = ({ onCloseBeforeContent, children }) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const handlersRef = useRef<PerpsTradeSheetFrameHandlers | null>(null);
  const isOpenedRef = useRef(false);

  const register = useCallback((handlers: PerpsTradeSheetFrameHandlers) => {
    handlersRef.current = handlers;
    // Content mounted after the open animation still gets its open callback.
    if (isOpenedRef.current) {
      handlers.onOpen?.();
    }
    return () => {
      if (handlersRef.current === handlers) {
        handlersRef.current = null;
      }
    };
  }, []);
  const value = useMemo(() => ({ sheetRef, register }), [register]);

  const handleOpen = useCallback(() => {
    isOpenedRef.current = true;
    handlersRef.current?.onOpen?.();
  }, []);

  const handleClose = useCallback(() => {
    if (handlersRef.current) {
      handlersRef.current.onClose();
    } else {
      onCloseBeforeContent();
    }
  }, [onCloseBeforeContent]);

  return (
    <BottomSheet
      ref={sheetRef}
      onOpen={handleOpen}
      onClose={handleClose}
      testID={PerpsTradeSheetSelectorsIDs.SHEET}
    >
      <PerpsTradeSheetFrameContext.Provider value={value}>
        {children}
      </PerpsTradeSheetFrameContext.Provider>
    </BottomSheet>
  );
};

/**
 * Static stand-in for the trade content while it mounts, sized to the last
 * trade content laid out.
 */
export const PerpsTradeSheetPlaceholder: React.FC<{
  onLayout: () => void;
}> = ({ onLayout }) => (
  <Box
    accessible={false}
    testID={PerpsTradeSheetSelectorsIDs.PLACEHOLDER}
    style={{ height: lastRootHeight ?? DEFAULT_PLACEHOLDER_HEIGHT }}
    onLayout={onLayout}
    paddingHorizontal={4}
    paddingTop={2}
    gap={6}
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={3}
    >
      <Box twClassName="h-10 w-10 rounded-full bg-muted" />
      <Box gap={2}>
        <Box twClassName="h-4 w-24 rounded bg-muted" />
        <Box twClassName="h-3 w-32 rounded bg-muted" />
      </Box>
    </Box>
    <Box alignItems={BoxAlignItems.Center}>
      <Box twClassName="h-10 w-28 rounded-lg bg-muted" />
    </Box>
    <Box twClassName="h-2 w-full rounded-full bg-muted" />
    <Box gap={4}>
      <Box twClassName="h-4 w-full rounded bg-muted" />
      <Box twClassName="h-4 w-full rounded bg-muted" />
      <Box twClassName="h-4 w-full rounded bg-muted" />
    </Box>
  </Box>
);

export interface PerpsTradeBottomSheetProps<Screen extends string> {
  onClose: () => void;
  /** Called once the sheet's open animation has finished. */
  onOpen?: () => void;
  onInteractive?: () => void;
  onCancelBeforeInteractive?: () => void;
  screens: Record<Screen, React.ReactNode>;
  rootScreen: Screen;
  screenDepth: Record<Screen, number>;
  /**
   * Nested screens that size to their own content instead of being locked to
   * the measured root screen height (e.g. short explainer screens). Every
   * other nested screen keeps the root height so the sheet does not jump
   * while navigating.
   */
  contentSizedScreens?: readonly Screen[];
  /** Optional heading shown on the root screen. */
  title?: string;
  /** Optional banner rendered directly below `title` on the root screen. */
  banner?: React.ReactNode;
}

const PerpsTradeBottomSheet = <Screen extends string>({
  onClose,
  onOpen,
  onInteractive,
  onCancelBeforeInteractive,
  title,
  banner,
  screens,
  rootScreen,
  screenDepth,
  contentSizedScreens,
}: PerpsTradeBottomSheetProps<Screen>) => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const frame = useContext(PerpsTradeSheetFrameContext);
  const ownSheetRef = useRef<BottomSheetRef>(null);
  const bottomSheetRef = frame?.sheetRef ?? ownSheetRef;
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
        // A route stacked on the confirmation, such as the pay-with token
        // list, owns this press. Consuming it here would dismiss the picker
        // while that route is still showing.
        if (!navigation.isFocused()) {
          return false;
        }
        goBack();
        return true;
      },
    );
    return () => subscription.remove();
  }, [activeScreen, goBack, navigation, rootScreen]);

  const handleContentLayout = useCallback(
    ({ nativeEvent }: LayoutChangeEvent) => {
      if (activeScreen === rootScreen && nativeEvent.layout.height > 0) {
        lastRootHeight = nativeEvent.layout.height;
        setRootHeight(nativeEvent.layout.height);
        if (!hasReportedInteractiveRef.current) {
          hasReportedInteractiveRef.current = true;
          onInteractive?.();
        }
      }
    },
    [activeScreen, onInteractive, rootScreen],
  );
  const isHeightLocked =
    activeScreen !== rootScreen &&
    rootHeight !== null &&
    !contentSizedScreens?.includes(activeScreen);

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
  }, [bottomSheetRef, handleClose]);

  // Inside a frame mounted ahead of this content, take over its callbacks.
  useLayoutEffect(
    () => frame?.register({ onOpen, onClose: handleClose }),
    [frame, handleClose, onOpen],
  );

  const contextValue = useMemo(
    () => ({ activeScreen, navigateTo, goBack, close, title, banner }),
    [activeScreen, banner, close, goBack, navigateTo, title],
  );

  const content = (
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
  );

  if (frame) {
    return content;
  }
  return (
    <BottomSheet
      ref={bottomSheetRef}
      onOpen={onOpen}
      onClose={handleClose}
      testID={PerpsTradeSheetSelectorsIDs.SHEET}
    >
      {content}
    </BottomSheet>
  );
};

export default PerpsTradeBottomSheet;
