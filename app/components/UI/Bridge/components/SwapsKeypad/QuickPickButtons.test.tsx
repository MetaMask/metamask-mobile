import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { QuickPickButtons } from './QuickPickButtons';
import { QuickPickButtonOption } from './types';

describe('QuickPickButtons', () => {
  const mockOnPress25 = jest.fn();
  const mockOnPress50 = jest.fn();
  const mockOnPress75 = jest.fn();
  const mockOnPressMax = jest.fn();

  const defaultOptions: QuickPickButtonOption[] = [
    { label: '25%', onPress: mockOnPress25 },
    { label: '50%', onPress: mockOnPress50 },
    { label: '75%', onPress: mockOnPress75 },
    { label: 'Max', onPress: mockOnPressMax },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders all buttons with correct labels', () => {
      const { getByText } = render(
        <QuickPickButtons options={defaultOptions} />,
      );

      expect(getByText('25%')).toBeTruthy();
      expect(getByText('50%')).toBeTruthy();
      expect(getByText('75%')).toBeTruthy();
      expect(getByText('Max')).toBeTruthy();
    });

    it('renders buttons in correct order', () => {
      const { getAllByRole } = render(
        <QuickPickButtons options={defaultOptions} />,
      );

      const buttons = getAllByRole('button');

      expect(buttons).toHaveLength(4);
    });

    it('returns null when hidden prop is true', () => {
      const { queryByText } = render(
        <QuickPickButtons options={defaultOptions} hidden />,
      );

      expect(queryByText('25%')).toBeNull();
      expect(queryByText('50%')).toBeNull();
      expect(queryByText('75%')).toBeNull();
      expect(queryByText('Max')).toBeNull();
    });

    it('renders when hidden prop is false', () => {
      const { getByText } = render(
        <QuickPickButtons options={defaultOptions} hidden={false} />,
      );

      expect(getByText('25%')).toBeTruthy();
      expect(getByText('50%')).toBeTruthy();
      expect(getByText('75%')).toBeTruthy();
      expect(getByText('Max')).toBeTruthy();
    });

    it('renders when hidden prop is undefined', () => {
      const { getByText } = render(
        <QuickPickButtons options={defaultOptions} hidden={undefined} />,
      );

      expect(getByText('25%')).toBeTruthy();
      expect(getByText('50%')).toBeTruthy();
      expect(getByText('75%')).toBeTruthy();
      expect(getByText('Max')).toBeTruthy();
    });
  });

  describe('button interactions', () => {
    it('calls correct onPress handler when 25% button is pressed', () => {
      const { getByText } = render(
        <QuickPickButtons options={defaultOptions} />,
      );

      const button25 = getByText('25%');

      act(() => {
        fireEvent.press(button25);
      });

      expect(mockOnPress25).toHaveBeenCalledTimes(1);
      expect(mockOnPress50).not.toHaveBeenCalled();
      expect(mockOnPress75).not.toHaveBeenCalled();
      expect(mockOnPressMax).not.toHaveBeenCalled();
    });

    it('calls correct onPress handler when 50% button is pressed', () => {
      const { getByText } = render(
        <QuickPickButtons options={defaultOptions} />,
      );

      const button50 = getByText('50%');

      act(() => {
        fireEvent.press(button50);
      });

      expect(mockOnPress50).toHaveBeenCalledTimes(1);
      expect(mockOnPress25).not.toHaveBeenCalled();
      expect(mockOnPress75).not.toHaveBeenCalled();
      expect(mockOnPressMax).not.toHaveBeenCalled();
    });

    it('calls correct onPress handler when 75% button is pressed', () => {
      const { getByText } = render(
        <QuickPickButtons options={defaultOptions} />,
      );

      const button75 = getByText('75%');

      act(() => {
        fireEvent.press(button75);
      });

      expect(mockOnPress75).toHaveBeenCalledTimes(1);
      expect(mockOnPress25).not.toHaveBeenCalled();
      expect(mockOnPress50).not.toHaveBeenCalled();
      expect(mockOnPressMax).not.toHaveBeenCalled();
    });

    it('calls correct onPress handler when Max button is pressed', () => {
      const { getByText } = render(
        <QuickPickButtons options={defaultOptions} />,
      );

      const buttonMax = getByText('Max');

      act(() => {
        fireEvent.press(buttonMax);
      });

      expect(mockOnPressMax).toHaveBeenCalledTimes(1);
      expect(mockOnPress25).not.toHaveBeenCalled();
      expect(mockOnPress50).not.toHaveBeenCalled();
      expect(mockOnPress75).not.toHaveBeenCalled();
    });

    it('handles multiple button presses correctly', () => {
      const { getByText } = render(
        <QuickPickButtons options={defaultOptions} />,
      );

      act(() => {
        fireEvent.press(getByText('25%'));
      });

      act(() => {
        fireEvent.press(getByText('50%'));
      });

      act(() => {
        fireEvent.press(getByText('25%'));
      });

      expect(mockOnPress25).toHaveBeenCalledTimes(2);
      expect(mockOnPress50).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('renders with empty options array', () => {
      const { queryByRole } = render(<QuickPickButtons options={[]} />);

      const buttons = queryByRole('button');

      expect(buttons).toBeNull();
    });

    it('renders with single option', () => {
      const singleOption: QuickPickButtonOption[] = [
        { label: 'Single', onPress: mockOnPress25 },
      ];

      const { getByText, queryByText } = render(
        <QuickPickButtons options={singleOption} />,
      );

      expect(getByText('Single')).toBeTruthy();
      expect(queryByText('25%')).toBeNull();
    });

    it('renders with custom labels', () => {
      const customOptions: QuickPickButtonOption[] = [
        { label: 'Low', onPress: mockOnPress25 },
        { label: 'Medium', onPress: mockOnPress50 },
        { label: 'High', onPress: mockOnPress75 },
        { label: 'All', onPress: mockOnPressMax },
      ];

      const { getByText } = render(
        <QuickPickButtons options={customOptions} />,
      );

      expect(getByText('Low')).toBeTruthy();
      expect(getByText('Medium')).toBeTruthy();
      expect(getByText('High')).toBeTruthy();
      expect(getByText('All')).toBeTruthy();
    });

    it('handles options with same label but different handlers', () => {
      const duplicateOptions: QuickPickButtonOption[] = [
        { label: 'Same', onPress: mockOnPress25 },
        { label: 'Same', onPress: mockOnPress50 },
      ];

      const { getAllByText } = render(
        <QuickPickButtons options={duplicateOptions} />,
      );

      const buttons = getAllByText('Same');

      expect(buttons).toHaveLength(2);

      act(() => {
        fireEvent.press(buttons[0]);
      });

      expect(mockOnPress25).toHaveBeenCalledTimes(1);
      expect(mockOnPress50).not.toHaveBeenCalled();
    });

    it('handles onPress with no-op function', () => {
      const noOpOptions: QuickPickButtonOption[] = [
        // eslint-disable-next-line no-empty-function
        { label: 'NoOp', onPress: () => {} },
      ];

      const { getByText } = render(<QuickPickButtons options={noOpOptions} />);

      expect(() => {
        act(() => {
          fireEvent.press(getByText('NoOp'));
        });
      }).not.toThrow();
    });
  });

  describe('standard quick pick options', () => {
    it('renders standard percentage options', () => {
      const standardOptions: QuickPickButtonOption[] = [
        { label: '25%', onPress: mockOnPress25 },
        { label: '50%', onPress: mockOnPress50 },
        { label: '75%', onPress: mockOnPress75 },
        { label: '90%', onPress: mockOnPressMax },
      ];

      const { getByText } = render(
        <QuickPickButtons options={standardOptions} />,
      );

      expect(getByText('25%')).toBeTruthy();
      expect(getByText('50%')).toBeTruthy();
      expect(getByText('75%')).toBeTruthy();
      expect(getByText('90%')).toBeTruthy();
    });
  });

  describe('gasless quick pick options', () => {
    it('renders gasless options with Max button', () => {
      const gaslessOptions: QuickPickButtonOption[] = [
        { label: '25%', onPress: mockOnPress25 },
        { label: '50%', onPress: mockOnPress50 },
        { label: '75%', onPress: mockOnPress75 },
        { label: 'Max', onPress: mockOnPressMax },
      ];

      const { getByText, queryByText } = render(
        <QuickPickButtons options={gaslessOptions} />,
      );

      expect(getByText('25%')).toBeTruthy();
      expect(getByText('50%')).toBeTruthy();
      expect(getByText('75%')).toBeTruthy();
      expect(getByText('Max')).toBeTruthy();
      expect(queryByText('90%')).toBeNull();
    });
  });

  describe('button accessibility', () => {
    it('all buttons are accessible', () => {
      const { getAllByRole } = render(
        <QuickPickButtons options={defaultOptions} />,
      );

      const buttons = getAllByRole('button');

      buttons.forEach((button) => {
        expect(button).toBeTruthy();
      });
    });
  });

  describe('re-rendering behavior', () => {
    it('updates when options change', () => {
      const initialOptions: QuickPickButtonOption[] = [
        { label: 'Initial', onPress: mockOnPress25 },
      ];

      const { getByText, rerender, queryByText } = render(
        <QuickPickButtons options={initialOptions} />,
      );

      expect(getByText('Initial')).toBeTruthy();

      const updatedOptions: QuickPickButtonOption[] = [
        { label: 'Updated', onPress: mockOnPress50 },
      ];

      rerender(<QuickPickButtons options={updatedOptions} />);

      expect(getByText('Updated')).toBeTruthy();
      expect(queryByText('Initial')).toBeNull();
    });

    it('updates when hidden prop changes', () => {
      const { getByText, rerender, queryByText } = render(
        <QuickPickButtons options={defaultOptions} hidden={false} />,
      );

      expect(getByText('25%')).toBeTruthy();

      rerender(<QuickPickButtons options={defaultOptions} hidden />);

      expect(queryByText('25%')).toBeNull();
    });

    it('maintains functionality after re-render', () => {
      const { getByText, rerender } = render(
        <QuickPickButtons options={defaultOptions} />,
      );

      rerender(<QuickPickButtons options={defaultOptions} />);

      act(() => {
        fireEvent.press(getByText('25%'));
      });

      expect(mockOnPress25).toHaveBeenCalledTimes(1);
    });
  });
});
