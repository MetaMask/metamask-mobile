import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TimeframeSelector from './TimeframeSelector';
import { ChartTimeframe } from './PredictGameChart.types';

jest.mock('@metamask/design-system-react-native', () => {
  const ReactMock = jest.requireActual('react');
  const { View, Text, Pressable } = jest.requireActual('react-native');
  const FilterButtonGroupContext = ReactMock.createContext(undefined);

  return {
    FilterButtonGroup: ({
      children,
      onChange,
      ...props
    }: {
      children?: React.ReactNode;
      onChange?: (value: string) => void;
    }) => (
      <FilterButtonGroupContext.Provider value={onChange}>
        <View testID="filter-button-group" {...props}>
          {children}
        </View>
      </FilterButtonGroupContext.Provider>
    ),
    FilterButton: ({
      children,
      value,
      isDisabled,
    }: {
      children?: React.ReactNode;
      value: string;
      isDisabled?: boolean;
    }) => {
      const onChange = ReactMock.useContext(FilterButtonGroupContext);

      return (
        <Pressable
          disabled={isDisabled}
          onPress={() => !isDisabled && onChange?.(value)}
        >
          <Text>{children}</Text>
        </Pressable>
      );
    },
    FilterButtonSize: { Sm: 'sm' },
    FilterButtonVariant: { Secondary: 'secondary' },
  };
});

const defaultProps = {
  selected: 'live' as ChartTimeframe,
  onSelect: jest.fn(),
  disabled: false,
};

describe('TimeframeSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all timeframe options', () => {
      const { getByText } = render(<TimeframeSelector {...defaultProps} />);

      expect(getByText('Live')).toBeTruthy();
      expect(getByText('6H')).toBeTruthy();
      expect(getByText('1D')).toBeTruthy();
      expect(getByText('Max')).toBeTruthy();
    });

    it('accepts layout classes from its container', () => {
      const { getByTestId } = render(
        <TimeframeSelector {...defaultProps} twClassName="px-4" />,
      );

      expect(getByTestId('filter-button-group').props.twClassName).toBe(
        'w-full justify-between pt-2 px-4',
      );
    });

    it('renders with selected state for live timeframe', () => {
      const { getByText } = render(
        <TimeframeSelector {...defaultProps} selected="live" />,
      );

      expect(getByText('Live')).toBeTruthy();
    });

    it('renders with selected state for 6h timeframe', () => {
      const { getByText } = render(
        <TimeframeSelector {...defaultProps} selected="6h" />,
      );

      expect(getByText('6H')).toBeTruthy();
    });

    it('renders with selected state for 1d timeframe', () => {
      const { getByText } = render(
        <TimeframeSelector {...defaultProps} selected="1d" />,
      );

      expect(getByText('1D')).toBeTruthy();
    });

    it('renders with selected state for max timeframe', () => {
      const { getByText } = render(
        <TimeframeSelector {...defaultProps} selected="max" />,
      );

      expect(getByText('Max')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('calls onSelect when Live is pressed', () => {
      const onSelect = jest.fn();
      const { getByText } = render(
        <TimeframeSelector {...defaultProps} onSelect={onSelect} />,
      );

      fireEvent.press(getByText('Live'));

      expect(onSelect).toHaveBeenCalledWith('live');
    });

    it('calls onSelect when 6H is pressed', () => {
      const onSelect = jest.fn();
      const { getByText } = render(
        <TimeframeSelector {...defaultProps} onSelect={onSelect} />,
      );

      fireEvent.press(getByText('6H'));

      expect(onSelect).toHaveBeenCalledWith('6h');
    });

    it('calls onSelect when 1D is pressed', () => {
      const onSelect = jest.fn();
      const { getByText } = render(
        <TimeframeSelector {...defaultProps} onSelect={onSelect} />,
      );

      fireEvent.press(getByText('1D'));

      expect(onSelect).toHaveBeenCalledWith('1d');
    });

    it('calls onSelect when Max is pressed', () => {
      const onSelect = jest.fn();
      const { getByText } = render(
        <TimeframeSelector {...defaultProps} onSelect={onSelect} />,
      );

      fireEvent.press(getByText('Max'));

      expect(onSelect).toHaveBeenCalledWith('max');
    });
  });

  describe('Disabled State', () => {
    it('does not call onSelect when disabled', () => {
      const onSelect = jest.fn();
      const { getByText } = render(
        <TimeframeSelector {...defaultProps} onSelect={onSelect} disabled />,
      );

      fireEvent.press(getByText('6H'));

      expect(onSelect).not.toHaveBeenCalled();
    });

    it('does not call onSelect for any timeframe when disabled', () => {
      const onSelect = jest.fn();
      const { getByText } = render(
        <TimeframeSelector {...defaultProps} onSelect={onSelect} disabled />,
      );

      fireEvent.press(getByText('Live'));
      fireEvent.press(getByText('6H'));
      fireEvent.press(getByText('1D'));
      fireEvent.press(getByText('Max'));

      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('Default Props', () => {
    it('uses default disabled value of false', () => {
      const onSelect = jest.fn();
      const { getByText } = render(
        <TimeframeSelector selected="live" onSelect={onSelect} />,
      );

      fireEvent.press(getByText('6H'));

      expect(onSelect).toHaveBeenCalledWith('6h');
    });
  });

  describe('Timeframe Values', () => {
    it.each([
      ['Live', 'live'],
      ['6H', '6h'],
      ['1D', '1d'],
      ['Max', 'max'],
    ] as [string, ChartTimeframe][])(
      'maps %s button to %s value',
      (label, value) => {
        const onSelect = jest.fn();
        const { getByText } = render(
          <TimeframeSelector {...defaultProps} onSelect={onSelect} />,
        );

        fireEvent.press(getByText(label));

        expect(onSelect).toHaveBeenCalledWith(value);
      },
    );
  });
});
