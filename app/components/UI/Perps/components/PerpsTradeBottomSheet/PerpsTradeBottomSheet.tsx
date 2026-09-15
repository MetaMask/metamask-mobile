import {
  BottomSheetDialog,
  Box,
  Text,
  TextVariant,
  type BottomSheetDialogRef,
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
import Animated, {
  useSharedValue,
  type EntryExitAnimationFunction,
  type SharedValue,
  withTiming,
} from 'react-native-reanimated';
import { AnimationDuration } from '@metamask/design-tokens';

export type PerpsTradeSheetScreen =
  | 'trade'
  | 'settings'
  | 'leverage'
  | 'payWith'
  | 'orderSummary';

const SCREEN_DEPTH: Record<PerpsTradeSheetScreen, number> = {
  trade: 0,
  settings: 1,
  leverage: 1,
  payWith: 1,
  orderSummary: 1,
};

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

export interface PerpsTradeSheetContextValue {
  activeScreen: PerpsTradeSheetScreen;
  navigateTo: (screen: PerpsTradeSheetScreen) => void;
  goBack: () => void;
  close: () => void;
  title?: string;
  banner?: React.ReactNode;
}

const PerpsTradeSheetContext =
  createContext<PerpsTradeSheetContextValue | null>(null);

export const usePerpsTradeSheet = (): PerpsTradeSheetContextValue => {
  const context = useContext(PerpsTradeSheetContext);
  if (!context) {
    throw new Error(
      'usePerpsTradeSheet must be used within PerpsTradeBottomSheet',
    );
  }
  return context;
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

export interface PerpsTradeBottomSheetProps {
  onClose: () => void;
  screens: Record<PerpsTradeSheetScreen, React.ReactNode>;
  /** Optional heading shown on the root Trade screen. */
  title?: string;
  /** Optional banner rendered directly below `title` on the root Trade screen. */
  banner?: React.ReactNode;
}

const PerpsTradeBottomSheet: React.FC<PerpsTradeBottomSheetProps> = ({
  onClose,
  title,
  banner,
  screens,
}) => {
  const tw = useTailwind();
  const bottomSheetRef = useRef<BottomSheetDialogRef>(null);
  const [isReady, setIsReady] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [activeScreen, setActiveScreen] =
    useState<PerpsTradeSheetScreen>('trade');
  const direction = useSharedValue<ScreenDirection>(1);
  const { entering, exiting } = useMemo(
    () => makeScreenTransitions(direction),
    [direction],
  );

  useEffect(() => {
    bottomSheetRef.current?.onOpenDialog(() => setIsReady(true));
  }, []);

  const navigateTo = useCallback(
    (next: PerpsTradeSheetScreen) => {
      setHasNavigated(true);
      setActiveScreen((current) => {
        direction.value = SCREEN_DEPTH[next] >= SCREEN_DEPTH[current] ? 1 : -1;
        return next;
      });
    },
    [direction],
  );

  const goBack = useCallback(() => navigateTo('trade'), [navigateTo]);

  const close = useCallback(() => {
    setIsClosing(true);
    const sheet = bottomSheetRef.current;
    if (sheet?.onCloseDialog) {
      sheet.onCloseDialog(onClose);
    } else {
      onClose();
    }
  }, [onClose]);

  const contextValue = useMemo(
    () => ({ activeScreen, navigateTo, goBack, close, title, banner }),
    [activeScreen, banner, close, goBack, navigateTo, title],
  );

  return (
    <BottomSheetDialog ref={bottomSheetRef} onClose={onClose}>
      {isReady ? (
        <PerpsTradeSheetContext.Provider value={contextValue}>
          <Box accessible={false} twClassName="overflow-hidden">
            <Animated.View
              key={activeScreen}
              entering={hasNavigated ? entering : undefined}
              exiting={isClosing ? undefined : exiting}
              style={tw.style('w-full')}
            >
              {screens[activeScreen]}
            </Animated.View>
          </Box>
        </PerpsTradeSheetContext.Provider>
      ) : null}
    </BottomSheetDialog>
  );
};

export default PerpsTradeBottomSheet;
