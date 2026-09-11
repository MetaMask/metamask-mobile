/* eslint-disable @metamask/design-tokens/color-no-hex */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import SocialFiltersBottomSheet from './SocialFiltersBottomSheet';
import { DEFAULT_FILTERS } from './filterDefaults';
import type { SocialShellFilters } from './types';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('react-native-gesture-handler', () => {
  const chainable = () => {
    const api: Record<string, unknown> = {};
    const returnApi = () => api;
    [
      'enabled',
      'onBegin',
      'onStart',
      'onUpdate',
      'onEnd',
      'onFinalize',
      'activeOffsetX',
      'failOffsetY',
      'hitSlop',
      'minDistance',
      'maxPointers',
    ].forEach((method) => {
      api[method] = jest.fn(returnApi);
    });
    return api;
  };

  return {
    Gesture: {
      Pan: jest.fn(chainable),
    },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) =>
      children,
  };
});

jest.mock('react-native-reanimated', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (initial: unknown) => ({ value: initial }),
    useAnimatedStyle: () => ({}),
    useAnimatedReaction: (
      _prepare: () => unknown,
      _react: (current: unknown, previous: unknown) => void,
    ) => {
      ReactActual.useEffect(() => {
        const current = _prepare();
        _react(current, null);
      });
    },
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
    withTiming: (val: unknown) => val,
  };
});

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: { default: '#fff', muted: '#eee' },
      icon: { default: '#000' },
      overlay: { default: 'rgba(0,0,0,0.5)' },
    },
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react') as typeof React;
  const {
    View,
    Text: RNText,
    ScrollView: RNScrollView,
    Pressable,
  } = jest.requireActual('react-native');
  return {
    BottomSheet: ({
      children,
      testID,
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(View, { testID }, children),
    BottomSheetHeader: ({ children }: { children: React.ReactNode }) =>
      children as React.ReactElement,
    BottomSheetFooter: ({
      primaryButtonProps,
    }: {
      primaryButtonProps: {
        onPress: () => void;
        testID: string;
        children: string;
      };
    }) =>
      ReactActual.createElement(
        Pressable,
        {
          onPress: primaryButtonProps.onPress,
          testID: primaryButtonProps.testID,
        },
        primaryButtonProps.children,
      ),
    Box: ({
      children,
      twClassName,
      testID,
    }: {
      children: React.ReactNode;
      twClassName?: string;
      testID?: string;
    }) => ReactActual.createElement(View, { testID }, children),
    ScrollView: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(RNScrollView, null, children),
    Text: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(RNText, null, children),
    TextColor: { TextAlternative: 'alt', TextDefault: 'default' },
    TextVariant: { BodyMd: 'body-md' },
    FontWeight: { Medium: 'medium' },
    ButtonSize: { Lg: 'lg' },
    FilterButton: ({
      children,
      value,
      testID,
      onPress,
    }: {
      children: React.ReactNode;
      value: string;
      testID: string;
      onPress?: () => void;
    }) =>
      ReactActual.createElement(
        Pressable,
        { key: value, testID, onPress: onPress ?? (() => undefined) },
        children,
      ),
    FilterButtonGroup: ({
      children,
      onChange,
    }: {
      children: React.ReactNode;
      onChange?: (value: string) => void;
    }) =>
      ReactActual.Children.toArray(children).map((child) => {
        if (
          !ReactActual.isValidElement<{ value?: string; onPress?: () => void }>(
            child,
          )
        ) {
          return child;
        }
        const { value } = child.props;
        if (!value) {
          return child;
        }
        return ReactActual.cloneElement(child, {
          onPress: () => onChange?.(value),
        });
      }),
    FilterButtonSize: { Lg: 'lg' },
    FilterButtonVariant: { Secondary: 'secondary' },
  };
});

describe('SocialFiltersBottomSheet', () => {
  const baseDraft: SocialShellFilters = { ...DEFAULT_FILTERS };

  it('renders the sheet title and show results CTA', () => {
    render(
      <SocialFiltersBottomSheet
        tab="feed"
        draft={baseDraft}
        onChange={jest.fn()}
        onApply={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByTestId('social-filters-bottom-sheet')).toBeOnTheScreen();
    expect(
      screen.getByTestId('social-filters-bottom-sheet-show-results'),
    ).toBeOnTheScreen();
  });

  it('renders the Type section for every tab', () => {
    render(
      <SocialFiltersBottomSheet
        tab="leaderboard"
        draft={baseDraft}
        onChange={jest.fn()}
        onApply={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByTestId('social-filters-type-all')).toBeOnTheScreen();
    expect(screen.getByTestId('social-filters-type-tokens')).toBeOnTheScreen();
  });

  it('hides the Time frame section on the Live trades tab', () => {
    render(
      <SocialFiltersBottomSheet
        tab="liveTrades"
        draft={baseDraft}
        onChange={jest.fn()}
        onApply={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.queryByTestId('social-filters-timeframe-1h')).toBeNull();
  });

  it('shows the Time frame section on Feed and Leaderboard', () => {
    const { rerender } = render(
      <SocialFiltersBottomSheet
        tab="feed"
        draft={baseDraft}
        onChange={jest.fn()}
        onApply={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByTestId('social-filters-timeframe-1h')).toBeOnTheScreen();

    rerender(
      <SocialFiltersBottomSheet
        tab="leaderboard"
        draft={baseDraft}
        onChange={jest.fn()}
        onApply={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByTestId('social-filters-timeframe-1h')).toBeOnTheScreen();
  });

  it('hides the Market cap and 24h volume sliders on the Leaderboard tab', () => {
    render(
      <SocialFiltersBottomSheet
        tab="leaderboard"
        draft={baseDraft}
        onChange={jest.fn()}
        onApply={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.queryByTestId('social-filters-market_cap-slider')).toBeNull();
    expect(screen.queryByTestId('social-filters-volume_24h-slider')).toBeNull();
  });

  it('shows the Following cohort chip on Feed and Live trades but not Leaderboard', () => {
    const { rerender } = render(
      <SocialFiltersBottomSheet
        tab="feed"
        draft={baseDraft}
        onChange={jest.fn()}
        onApply={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(
      screen.getByTestId('social-filters-cohort-following'),
    ).toBeOnTheScreen();

    rerender(
      <SocialFiltersBottomSheet
        tab="liveTrades"
        draft={baseDraft}
        onChange={jest.fn()}
        onApply={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(
      screen.getByTestId('social-filters-cohort-following'),
    ).toBeOnTheScreen();

    rerender(
      <SocialFiltersBottomSheet
        tab="leaderboard"
        draft={baseDraft}
        onChange={jest.fn()}
        onApply={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('social-filters-cohort-following')).toBeNull();
  });

  it('calls onApply when Show results is tapped', () => {
    const onApply = jest.fn();
    render(
      <SocialFiltersBottomSheet
        tab="feed"
        draft={baseDraft}
        onChange={jest.fn()}
        onApply={onApply}
        onClose={jest.fn()}
      />,
    );

    fireEvent.press(
      screen.getByTestId('social-filters-bottom-sheet-show-results'),
    );

    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('calls onChange with the new type when a Type chip is tapped', () => {
    const onChange = jest.fn();
    render(
      <SocialFiltersBottomSheet
        tab="feed"
        draft={baseDraft}
        onChange={onChange}
        onApply={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId('social-filters-type-tokens'));

    expect(onChange).toHaveBeenCalledWith({ type: 'tokens' });
  });
});
