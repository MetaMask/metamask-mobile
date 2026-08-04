import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  PerpsMode,
} from '@metamask/perps-controller';
import { withSpring } from 'react-native-reanimated';
import PerpsModeToggle, {
  PERPS_PRO_ACCENT_SELECTED_BG,
} from './PerpsModeToggle';
import { PerpsModeToggleSelectorsIDs } from '../../Perps.testIds';
import { lightTheme } from '@metamask/design-tokens';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { mockTheme } from '../../../../../util/theme';

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

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...Reanimated,
    withSpring: jest.fn((value: number) => value),
    interpolateColor: jest.fn(
      (_value: number, _input: number[], output: string[]) => output[0],
    ),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    ButtonBaseSize: { Sm: 'sm', Md: 'md', Lg: 'lg' },
    BoxFlexDirection: { Row: 'row' },
    FontWeight: { Medium: '500', Regular: '400' },
    TextVariant: { BodySm: 'BodySm' },
    TextColor: {
      TextDefault: 'TextDefault',
      TextAlternative: 'TextAlternative',
    },
    Box: ({
      children,
      testID,
      accessibilityRole,
      style,
      ...rest
    }: {
      children?: React.ReactNode;
      testID?: string;
      accessibilityRole?: string;
      style?: unknown;
      twClassName?: string;
      flexDirection?: string;
    }) => (
      <View
        testID={testID}
        accessibilityRole={accessibilityRole}
        style={style}
        {...rest}
      >
        {children}
      </View>
    ),
    Text: ({
      children,
      color,
    }: {
      children: React.ReactNode;
      color?: string;
    }) => <Text style={{ color }}>{children}</Text>,
    ButtonBase: ({
      children,
      testID,
      onPress,
      accessibilityLabel,
      accessibilityHint,
    }: {
      children: React.ReactNode;
      testID?: string;
      onPress?: () => void;
      accessibilityLabel?: string;
      accessibilityHint?: string;
    }) => (
      <TouchableOpacity
        testID={testID}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      >
        <Text>{children}</Text>
      </TouchableOpacity>
    ),
  };
});

const layoutLiteSegment = (width = 56) =>
  fireEvent(
    screen.getByTestId(PerpsModeToggleSelectorsIDs.LITE_SEGMENT),
    'layout',
    {
      nativeEvent: { layout: { x: 0, y: 0, width, height: 28 } },
    },
  );

const layoutProSegment = (width = 52) =>
  fireEvent(
    screen.getByTestId(PerpsModeToggleSelectorsIDs.PRO_SEGMENT),
    'layout',
    {
      nativeEvent: { layout: { x: 56, y: 0, width, height: 28 } },
    },
  );

describe('PerpsModeToggle', () => {
  beforeEach(() => {
    mockTrack.mockClear();
    (withSpring as jest.Mock).mockClear();
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

  it('calls onChange with the newly selected mode', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <PerpsModeToggle mode={PerpsMode.Lite} onChange={onChange} />,
    );

    fireEvent.press(getByTestId(PerpsModeToggleSelectorsIDs.PRO_SEGMENT));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(PerpsMode.Pro);
  });

  it('tracks a Perps UI interaction event carrying the new mode on change', () => {
    const { getByTestId } = render(
      <PerpsModeToggle
        mode={PerpsMode.Lite}
        onChange={jest.fn()}
        source={PERPS_EVENT_VALUE.SOURCE.TRADE_MENU_ACTION}
      />,
    );

    fireEvent.press(getByTestId(PerpsModeToggleSelectorsIDs.PRO_SEGMENT));

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
        [PERPS_EVENT_PROPERTY.MODE]: PerpsMode.Pro,
        [PERPS_EVENT_PROPERTY.SOURCE]:
          PERPS_EVENT_VALUE.SOURCE.TRADE_MENU_ACTION,
      },
    );
  });

  it('omits the source property when no source is provided', () => {
    const { getByTestId } = render(
      <PerpsModeToggle mode={PerpsMode.Lite} onChange={jest.fn()} />,
    );

    fireEvent.press(getByTestId(PerpsModeToggleSelectorsIDs.PRO_SEGMENT));

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
        [PERPS_EVENT_PROPERTY.MODE]: PerpsMode.Pro,
      },
    );
  });

  it('does not call onChange or track when re-selecting the already active mode', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <PerpsModeToggle mode={PerpsMode.Lite} onChange={onChange} />,
    );

    fireEvent.press(getByTestId(PerpsModeToggleSelectorsIDs.LITE_SEGMENT));

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
    // Gradient label renders the string twice (mask + sizing text).
    expect(getAllByText('Pro').length).toBeGreaterThan(0);
  });

  it('flips to the opposite mode and tracks the change when the active pill is pressed', () => {
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

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(PerpsMode.Lite);
    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
        [PERPS_EVENT_PROPERTY.MODE]: PerpsMode.Lite,
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

  it('uses the Figma pro-selected fill color when no shared token exists', () => {
    // Figma variables expose accent/02 light/normal/dark only; selected fill
    // remains the documented ~18% accent/02/normal over background/default.
    // eslint-disable-next-line @metamask/design-tokens/color-no-hex
    expect(PERPS_PRO_ACCENT_SELECTED_BG).toBe('#382b43');
  });

  it('wires Pro gradient label colors from accent02 design tokens', () => {
    expect(mockTheme.colors.accent02.light).toBe(
      lightTheme.colors.accent02.light,
    );
    expect(mockTheme.colors.accent02.normal).toBe(
      lightTheme.colors.accent02.normal,
    );
  });

  it('snaps the slider without animating when mounted in Pro mode', () => {
    render(<PerpsModeToggle mode={PerpsMode.Pro} onChange={jest.fn()} />);

    layoutLiteSegment();
    layoutProSegment();

    expect(withSpring).not.toHaveBeenCalled();
    expect(
      screen.getByTestId(PerpsModeToggleSelectorsIDs.SLIDER),
    ).toBeOnTheScreen();
  });

  it('animates the slider only after the initial placement when mode changes', () => {
    const { rerender } = render(
      <PerpsModeToggle mode={PerpsMode.Lite} onChange={jest.fn()} />,
    );

    layoutLiteSegment();
    layoutProSegment();

    expect(withSpring).not.toHaveBeenCalled();
    expect(
      screen.getByTestId(PerpsModeToggleSelectorsIDs.SLIDER),
    ).toBeOnTheScreen();

    rerender(<PerpsModeToggle mode={PerpsMode.Pro} onChange={jest.fn()} />);

    expect(withSpring).toHaveBeenCalledTimes(1);
    expect(withSpring).toHaveBeenCalledWith(1, {
      duration: 150,
      dampingRatio: 0.75,
    });
  });
});
