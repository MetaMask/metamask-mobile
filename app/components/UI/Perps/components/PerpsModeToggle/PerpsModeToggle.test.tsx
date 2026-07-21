import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsModeToggle from './PerpsModeToggle';
import { PerpsMode } from './PerpsModeToggle.types';
import { PerpsModeToggleSelectorsIDs } from '../../Perps.testIds';

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
  it('renders both Lite and Pro segments in the default toggle variant', () => {
    const { getByTestId, getByText } = render(
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
    expect(getByText('Pro')).toBeOnTheScreen();
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

  it('does not call onChange when re-selecting the already active mode', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <PerpsModeToggle mode={PerpsMode.Lite} onChange={onChange} />,
    );

    fireEvent.press(getByTestId(PerpsModeToggleSelectorsIDs.LITE_SEGMENT));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders only the active mode as a read-only pill in the active variant', () => {
    const onChange = jest.fn();
    const { getByTestId, queryByTestId, getByText } = render(
      <PerpsModeToggle
        mode={PerpsMode.Pro}
        onChange={onChange}
        variant="active"
      />,
    );

    expect(
      getByTestId(PerpsModeToggleSelectorsIDs.PRO_SEGMENT),
    ).toBeOnTheScreen();
    expect(queryByTestId(PerpsModeToggleSelectorsIDs.LITE_SEGMENT)).toBeNull();
    expect(getByText('Pro')).toBeOnTheScreen();

    fireEvent.press(getByTestId(PerpsModeToggleSelectorsIDs.PRO_SEGMENT));
    expect(onChange).not.toHaveBeenCalled();
  });
});
