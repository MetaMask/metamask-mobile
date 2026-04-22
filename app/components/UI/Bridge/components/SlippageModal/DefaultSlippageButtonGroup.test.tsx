import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DefaultSlippageButtonGroup } from './DefaultSlippageButtonGroup';

describe('DefaultSlippageButtonGroup', () => {
  const mockOnPress1 = jest.fn();
  const mockOnPress2 = jest.fn();
  const mockOnPress3 = jest.fn();

  const defaultOptions = [
    { id: 'auto', label: 'Auto', selected: false, onPress: mockOnPress1 },
    { id: '1', label: '1%', selected: true, onPress: mockOnPress2 },
    { id: '2', label: '2%', selected: false, onPress: mockOnPress3 },
  ];

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders all provided options', () => {
      const { getByText } = render(
        <DefaultSlippageButtonGroup options={defaultOptions} />,
      );

      expect(getByText('Auto')).toBeOnTheScreen();
      expect(getByText('1%')).toBeOnTheScreen();
      expect(getByText('2%')).toBeOnTheScreen();
    });

    it('renders correct number of buttons', () => {
      const { getAllByRole } = render(
        <DefaultSlippageButtonGroup options={defaultOptions} />,
      );

      const buttons = getAllByRole('button');
      expect(buttons).toHaveLength(3);
    });

    it('renders empty list when no options provided', () => {
      const { queryAllByRole } = render(
        <DefaultSlippageButtonGroup options={[]} />,
      );

      const buttons = queryAllByRole('button');
      expect(buttons).toHaveLength(0);
    });
  });

  describe('styling', () => {
    it('renders correct styling with one option selected', () => {
      const { getAllByRole } = render(
        <DefaultSlippageButtonGroup options={defaultOptions} />,
      );

      expect(getAllByRole('button')).toHaveLength(3);
    });

    it('renders correct styling with no options selected', () => {
      const options = [
        { id: 'auto', label: 'Auto', selected: false, onPress: jest.fn() },
        { id: '1', label: '1%', selected: false, onPress: jest.fn() },
        { id: '2', label: '2%', selected: false, onPress: jest.fn() },
      ];

      const { getAllByRole } = render(
        <DefaultSlippageButtonGroup options={options} />,
      );

      expect(getAllByRole('button')).toHaveLength(3);
    });

    it('renders correct styling with first option selected', () => {
      const options = [
        { id: 'auto', label: 'Auto', selected: true, onPress: jest.fn() },
        { id: '1', label: '1%', selected: false, onPress: jest.fn() },
        { id: '2', label: '2%', selected: false, onPress: jest.fn() },
      ];

      const { getByText } = render(
        <DefaultSlippageButtonGroup options={options} />,
      );

      expect(getByText('Auto')).toBeOnTheScreen();
    });

    it('renders correct styling with last option selected', () => {
      const options = [
        { id: 'auto', label: 'Auto', selected: false, onPress: jest.fn() },
        { id: '1', label: '1%', selected: false, onPress: jest.fn() },
        { id: '2', label: '2%', selected: true, onPress: jest.fn() },
      ];

      const { getByText } = render(
        <DefaultSlippageButtonGroup options={options} />,
      );

      expect(getByText('2%')).toBeOnTheScreen();
    });

    it('renders correct styling with multiple options selected', () => {
      const options = [
        { id: 'auto', label: 'Auto', selected: true, onPress: jest.fn() },
        { id: '1', label: '1%', selected: true, onPress: jest.fn() },
        { id: '2', label: '2%', selected: false, onPress: jest.fn() },
      ];

      const { getByText } = render(
        <DefaultSlippageButtonGroup options={options} />,
      );

      expect(getByText('Auto')).toBeOnTheScreen();
      expect(getByText('1%')).toBeOnTheScreen();
    });
  });

  describe('interaction', () => {
    it('calls onPress callback when button is pressed', () => {
      const { getByText } = render(
        <DefaultSlippageButtonGroup options={defaultOptions} />,
      );

      fireEvent.press(getByText('Auto'));
      expect(mockOnPress1).toHaveBeenCalledTimes(1);

      fireEvent.press(getByText('1%'));
      expect(mockOnPress2).toHaveBeenCalledTimes(1);

      fireEvent.press(getByText('2%'));
      expect(mockOnPress3).toHaveBeenCalledTimes(1);
    });

    it('calls correct callback for selected option', () => {
      const { getByText } = render(
        <DefaultSlippageButtonGroup options={defaultOptions} />,
      );

      fireEvent.press(getByText('1%')); // Selected option
      expect(mockOnPress2).toHaveBeenCalledTimes(1);
      expect(mockOnPress1).not.toHaveBeenCalled();
      expect(mockOnPress3).not.toHaveBeenCalled();
    });

    it('calls correct callback for unselected option', () => {
      const { getByText } = render(
        <DefaultSlippageButtonGroup options={defaultOptions} />,
      );

      fireEvent.press(getByText('Auto')); // Unselected option
      expect(mockOnPress1).toHaveBeenCalledTimes(1);
      expect(mockOnPress2).not.toHaveBeenCalled();
      expect(mockOnPress3).not.toHaveBeenCalled();
    });

    it('handles multiple presses on same button', () => {
      const { getByText } = render(
        <DefaultSlippageButtonGroup options={defaultOptions} />,
      );

      const button = getByText('Auto');
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);

      expect(mockOnPress1).toHaveBeenCalledTimes(3);
    });
  });

  describe('edge cases', () => {
    it('handles single option', () => {
      const options = [
        { id: 'auto', label: 'Auto', selected: true, onPress: jest.fn() },
      ];

      const { getByText } = render(
        <DefaultSlippageButtonGroup options={options} />,
      );

      expect(getByText('Auto')).toBeOnTheScreen();
    });

    it('handles many options', () => {
      const options = [
        { id: '1', label: '1%', selected: false, onPress: jest.fn() },
        { id: '2', label: '2%', selected: false, onPress: jest.fn() },
        { id: '3', label: '3%', selected: true, onPress: jest.fn() },
        { id: '4', label: '4%', selected: false, onPress: jest.fn() },
        { id: '5', label: '5%', selected: false, onPress: jest.fn() },
        { id: 'custom', label: 'Custom', selected: false, onPress: jest.fn() },
      ];

      const { getAllByRole } = render(
        <DefaultSlippageButtonGroup options={options} />,
      );

      const buttons = getAllByRole('button');
      expect(buttons).toHaveLength(6);
    });

    it('handles long labels', () => {
      const options = [
        {
          id: '1',
          label: 'Very Long Custom Label',
          selected: false,
          onPress: jest.fn(),
        },
        {
          id: '2',
          label: 'Another Super Long Label Here',
          selected: true,
          onPress: jest.fn(),
        },
      ];

      const { getByText } = render(
        <DefaultSlippageButtonGroup options={options} />,
      );

      expect(getByText('Very Long Custom Label')).toBeOnTheScreen();
      expect(getByText('Another Super Long Label Here')).toBeOnTheScreen();
    });

    it('handles options without selected property', () => {
      const options = [
        { id: 'auto', label: 'Auto', onPress: jest.fn() },
        { id: '1', label: '1%', onPress: jest.fn() },
      ];

      const { getAllByRole } = render(
        <DefaultSlippageButtonGroup options={options} />,
      );

      // Should default to unselected (secondary variant)
      expect(getAllByRole('button')).toHaveLength(2);
    });

    it('handles special characters in labels', () => {
      const options = [
        { id: '1', label: '< 0.5%', selected: false, onPress: jest.fn() },
        { id: '2', label: '≥ 1%', selected: true, onPress: jest.fn() },
      ];

      const { getByText } = render(
        <DefaultSlippageButtonGroup options={options} />,
      );

      expect(getByText('< 0.5%')).toBeOnTheScreen();
      expect(getByText('≥ 1%')).toBeOnTheScreen();
    });
  });

  describe('button variants', () => {
    it('uses Primary variant for selected button', () => {
      const options = [
        { id: '1', label: '1%', selected: true, onPress: jest.fn() },
      ];

      const { getByText } = render(
        <DefaultSlippageButtonGroup options={options} />,
      );

      expect(getByText('1%')).toBeOnTheScreen();
    });

    it('uses Secondary variant for unselected button', () => {
      const options = [
        { id: '1', label: '1%', selected: false, onPress: jest.fn() },
      ];

      const { getByText } = render(
        <DefaultSlippageButtonGroup options={options} />,
      );

      expect(getByText('1%')).toBeOnTheScreen();
    });

    it('handles mixed selected states correctly', () => {
      const options = [
        { id: '1', label: '1%', selected: false, onPress: jest.fn() },
        { id: '2', label: '2%', selected: true, onPress: jest.fn() },
        { id: '3', label: '3%', selected: false, onPress: jest.fn() },
      ];

      const { getAllByRole } = render(
        <DefaultSlippageButtonGroup options={options} />,
      );

      expect(getAllByRole('button')).toHaveLength(3);
    });
  });

  describe('unique keys', () => {
    it('uses label as key for each option', () => {
      const options = [
        { id: 'auto', label: 'Auto', selected: true, onPress: jest.fn() },
        { id: '1', label: '1%', selected: false, onPress: jest.fn() },
      ];

      // Should not throw duplicate key warning
      const { getAllByRole } = render(
        <DefaultSlippageButtonGroup options={options} />,
      );

      expect(getAllByRole('button')).toHaveLength(2);
    });

    it('handles duplicate labels gracefully', () => {
      const options = [
        { id: '1', label: 'Auto', selected: true, onPress: jest.fn() },
        { id: '2', label: 'Auto', selected: false, onPress: jest.fn() },
      ];

      const { getAllByText } = render(
        <DefaultSlippageButtonGroup options={options} />,
      );

      const buttons = getAllByText('Auto');
      expect(buttons).toHaveLength(2);
    });
  });

  describe('complete component snapshots', () => {
    it('matches snapshot for typical slippage options', () => {
      const options = [
        { id: 'auto', label: 'Auto', selected: false, onPress: jest.fn() },
        { id: '0.5', label: '0.5%', selected: false, onPress: jest.fn() },
        { id: '2', label: '2%', selected: true, onPress: jest.fn() },
        { id: '3', label: '3%', selected: false, onPress: jest.fn() },
        { id: 'custom', label: 'Custom', selected: false, onPress: jest.fn() },
      ];

      const { getAllByRole, getByText } = render(
        <DefaultSlippageButtonGroup options={options} />,
      );

      expect(getAllByRole('button')).toHaveLength(5);
      expect(getByText('2%')).toBeOnTheScreen();
    });

    it('matches snapshot with auto selected', () => {
      const options = [
        { id: 'auto', label: 'Auto', selected: true, onPress: jest.fn() },
        { id: '1', label: '1%', selected: false, onPress: jest.fn() },
        { id: '2', label: '2%', selected: false, onPress: jest.fn() },
      ];

      const { getByText } = render(
        <DefaultSlippageButtonGroup options={options} />,
      );

      expect(getByText('Auto')).toBeOnTheScreen();
    });

    it('matches snapshot with custom selected', () => {
      const options = [
        { id: 'auto', label: 'Auto', selected: false, onPress: jest.fn() },
        { id: '1', label: '1%', selected: false, onPress: jest.fn() },
        { id: 'custom', label: 'Custom', selected: true, onPress: jest.fn() },
      ];

      const { getByText } = render(
        <DefaultSlippageButtonGroup options={options} />,
      );

      expect(getByText('Custom')).toBeOnTheScreen();
    });
  });
});
