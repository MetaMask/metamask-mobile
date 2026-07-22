import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  PerpsMode,
} from '@metamask/perps-controller';
import PerpsModeToggle from './PerpsModeToggle';
import { PerpsModeToggleSelectorsIDs } from '../../Perps.testIds';
import { MetaMetricsEvents } from '../../../../../core/Analytics';

const mockTrack = jest.fn();
jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({ track: mockTrack }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'perps.mode.lite': 'Lite',
      'perps.mode.pro': 'Pro',
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
    }: {
      children: React.ReactNode;
      testID?: string;
      onPress?: () => void;
    }) => (
      <TouchableOpacity testID={testID} onPress={onPress}>
        <Text>{children}</Text>
      </TouchableOpacity>
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

describe('PerpsModeToggle', () => {
  beforeEach(() => {
    mockTrack.mockClear();
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
});
