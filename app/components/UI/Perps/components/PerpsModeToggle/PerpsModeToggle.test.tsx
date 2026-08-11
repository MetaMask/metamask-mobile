import React from 'react';
import { act, render, fireEvent } from '@testing-library/react-native';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  PerpsMode,
} from '@metamask/perps-controller';
import PerpsModeToggle from './PerpsModeToggle';
import { PerpsModeToggleSelectorsIDs } from '../../Perps.testIds';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { GLOW_TOTAL_MS } from './PerpsModeSwitchPill';
import { PERPS_MODE_ANALYTICS_PROPERTY } from '../../utils/perpsModeAnalytics';

const mockTrack = jest.fn();
jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({ track: mockTrack }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: { mode?: string }) => {
    const translations: Record<string, string> = {
      'perps.mode.lite': 'Lite',
      'perps.mode.pro': 'Pro',
      'perps.mode.active_pill_accessibility_label': `Currently ${params?.mode ?? ''} mode`,
      'perps.mode.active_pill_accessibility_hint': `Switches to ${params?.mode ?? ''} mode`,
    };
    return translations[key] || key;
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    SegmentedControlSize: { Sm: 'sm', Md: 'md', Lg: 'lg' },
    ButtonBaseSize: { Sm: 'sm', Md: 'md', Lg: 'lg' },
    ButtonBase: ({
      children,
      testID,
      onPress,
      disabled,
      accessibilityLabel,
      accessibilityHint,
    }: {
      children: React.ReactNode;
      testID?: string;
      onPress?: () => void;
      disabled?: boolean;
      accessibilityLabel?: string;
      accessibilityHint?: string;
    }) => (
      <TouchableOpacity
        testID={testID}
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      >
        <Text>{children}</Text>
      </TouchableOpacity>
    ),
    Box: ({
      children,
      onLayout,
      ...props
    }: {
      children?: React.ReactNode;
      onLayout?: () => void;
    }) => (
      <View onLayout={onLayout} {...props}>
        {children}
      </View>
    ),
    SegmentedControl: ({
      value,
      onChange,
      children,
      testID,
    }: {
      value: string;
      onChange: (value: string) => void;
      children: React.ReactNode;
      testID?: string;
    }) => (
      <View testID={testID} accessibilityState={{ selected: value }}>
        {ReactActual.Children.map(
          children,
          (child: React.ReactElement<{ value: string }>) =>
            ReactActual.cloneElement(child, {
              onPress: () => onChange(child.props.value),
            }),
        )}
      </View>
    ),
    FilterButton: ({
      children,
      testID,
      onPress,
      isSelected,
    }: {
      children: React.ReactNode;
      testID?: string;
      onPress?: () => void;
      isSelected?: boolean;
    }) => (
      <TouchableOpacity
        testID={testID}
        onPress={onPress}
        accessibilityState={{ selected: !!isSelected }}
      >
        <Text>{children}</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (...args: unknown[]) => args,
  }),
}));

jest.mock('@react-native-masked-view/masked-view', () => {
  const { View } = jest.requireActual('react-native');
  return ({
    children,
    maskElement,
  }: {
    children?: React.ReactNode;
    maskElement?: React.ReactNode;
  }) => (
    <View>
      {maskElement}
      {children}
    </View>
  );
});

jest.mock('react-native-linear-gradient', () => {
  const { View } = jest.requireActual('react-native');
  return ({ children }: { children?: React.ReactNode }) => (
    <View>{children}</View>
  );
});

describe('PerpsModeToggle', () => {
  beforeEach(() => {
    mockTrack.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders both Lite and Pro segments in the default toggle variant', () => {
    const { getByTestId, getByText, getAllByText } = render(
      <PerpsModeToggle mode={PerpsMode.Lite} onChange={jest.fn()} />,
    );

    expect(
      getByTestId(PerpsModeToggleSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsModeToggleSelectorsIDs.LITE_SEGMENT),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsModeToggleSelectorsIDs.PRO_SEGMENT),
    ).toBeOnTheScreen();
    expect(getByText('Lite')).toBeOnTheScreen();
    // Gradient label renders the string twice (mask + sizing text).
    expect(getAllByText('Pro').length).toBeGreaterThan(0);
  });

  it('calls onChange with the newly selected mode', async () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <PerpsModeToggle mode={PerpsMode.Lite} onChange={onChange} />,
    );

    await act(async () => {
      fireEvent.press(getByTestId(PerpsModeToggleSelectorsIDs.PRO_SEGMENT));
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(PerpsMode.Pro);
  });

  it('tracks a Perps UI interaction event carrying the new mode after onChange applies it', async () => {
    const { getByTestId } = render(
      <PerpsModeToggle
        mode={PerpsMode.Lite}
        onChange={jest.fn()}
        source={PERPS_EVENT_VALUE.SOURCE.TRADE_MENU_ACTION}
      />,
    );

    await act(async () => {
      fireEvent.press(getByTestId(PerpsModeToggleSelectorsIDs.PRO_SEGMENT));
    });

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
        [PERPS_MODE_ANALYTICS_PROPERTY]: PerpsMode.Pro,
        [PERPS_EVENT_PROPERTY.SOURCE]:
          PERPS_EVENT_VALUE.SOURCE.TRADE_MENU_ACTION,
      },
    );
  });

  it('does not track when onChange reports the mode was not applied', async () => {
    const onChange = jest.fn().mockResolvedValue(false);
    const { getByTestId } = render(
      <PerpsModeToggle
        mode={PerpsMode.Lite}
        onChange={onChange}
        source={PERPS_EVENT_VALUE.SOURCE.PERPS_HOME}
      />,
    );

    await act(async () => {
      fireEvent.press(getByTestId(PerpsModeToggleSelectorsIDs.PRO_SEGMENT));
    });

    expect(onChange).toHaveBeenCalledWith(PerpsMode.Pro);
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('omits the source property when no source is provided', async () => {
    const { getByTestId } = render(
      <PerpsModeToggle mode={PerpsMode.Lite} onChange={jest.fn()} />,
    );

    await act(async () => {
      fireEvent.press(getByTestId(PerpsModeToggleSelectorsIDs.PRO_SEGMENT));
    });

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
        [PERPS_MODE_ANALYTICS_PROPERTY]: PerpsMode.Pro,
      },
    );
  });

  it('does not call onChange or track when re-selecting the already active mode', async () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <PerpsModeToggle mode={PerpsMode.Lite} onChange={onChange} />,
    );

    await act(async () => {
      fireEvent.press(getByTestId(PerpsModeToggleSelectorsIDs.LITE_SEGMENT));
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('renders only the active mode as a single pill in the active variant', () => {
    const { getByTestId, queryByTestId, getAllByText } = render(
      <PerpsModeToggle
        mode={PerpsMode.Pro}
        onChange={jest.fn()}
        variant="active"
      />,
    );

    expect(
      getByTestId(PerpsModeToggleSelectorsIDs.PRO_SEGMENT),
    ).toBeOnTheScreen();
    expect(queryByTestId(PerpsModeToggleSelectorsIDs.LITE_SEGMENT)).toBeNull();
    expect(getAllByText('Pro').length).toBeGreaterThan(0);
  });

  it('finishes the active-pill animation before changing mode', async () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    const { getByTestId } = render(
      <PerpsModeToggle
        mode={PerpsMode.Pro}
        onChange={onChange}
        variant="active"
        source={PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN}
      />,
    );

    fireEvent.press(getByTestId(PerpsModeToggleSelectorsIDs.PRO_SEGMENT));

    expect(onChange).not.toHaveBeenCalled();
    expect(getByTestId(PerpsModeToggleSelectorsIDs.PRO_SEGMENT)).toBeDisabled();
    await act(async () => {
      jest.advanceTimersByTime(GLOW_TOTAL_MS);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(PerpsMode.Lite);
    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
        [PERPS_MODE_ANALYTICS_PROPERTY]: PerpsMode.Lite,
        [PERPS_EVENT_PROPERTY.SOURCE]:
          PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
      },
    );
  });

  it('exposes VoiceOver label and hint for the active Pro pill', () => {
    const { getByTestId } = render(
      <PerpsModeToggle
        mode={PerpsMode.Pro}
        onChange={jest.fn()}
        variant="active"
      />,
    );

    const pill = getByTestId(PerpsModeToggleSelectorsIDs.PRO_SEGMENT);
    expect(pill.props.accessibilityLabel).toBe('Currently Pro mode');
    expect(pill.props.accessibilityHint).toBe('Switches to Lite mode');
  });

  it('exposes VoiceOver label and hint for the active Lite pill', () => {
    const { getByTestId } = render(
      <PerpsModeToggle
        mode={PerpsMode.Lite}
        onChange={jest.fn()}
        variant="active"
      />,
    );

    const pill = getByTestId(PerpsModeToggleSelectorsIDs.LITE_SEGMENT);
    expect(pill.props.accessibilityLabel).toBe('Currently Lite mode');
    expect(pill.props.accessibilityHint).toBe('Switches to Pro mode');
  });
});
