// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// Internal dependencies.
import SrpInput from './index';
import { act, fireEvent, render } from '@testing-library/react-native';

const TEXTFIELD_TEST_ID = 'srpInputID';
const INPUT_TEST_ID = 'testingInputID';
const START_ACCESSORY_TEST_ID = 'startAccessoryID';
const END_ACCESSORY_TEST_ID = 'endAccessoryID';

describe('SrpInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders default settings correctly', () => {
    const wrapper = render(<SrpInput value="" testID={TEXTFIELD_TEST_ID} />);
    expect(wrapper.getByTestId(TEXTFIELD_TEST_ID)).toBeOnTheScreen();
  });

  it('renders the startAccessory when provided', () => {
    const wrapper = render(
      <SrpInput
        value=""
        startAccessory={<View testID={START_ACCESSORY_TEST_ID} />}
        inputProps={{ testID: INPUT_TEST_ID }}
      />,
    );

    expect(wrapper.getByTestId(START_ACCESSORY_TEST_ID)).toBeOnTheScreen();
  });

  it('renders the endAccessory when provided', () => {
    const wrapper = render(
      <SrpInput
        value=""
        endAccessory={<View testID={END_ACCESSORY_TEST_ID} />}
        inputProps={{ testID: INPUT_TEST_ID }}
      />,
    );

    expect(wrapper.getByTestId(END_ACCESSORY_TEST_ID)).toBeOnTheScreen();
  });

  describe('selection updates', () => {
    it('sets selection to end of value on focus', () => {
      const testValue = 'test recovery phrase';
      const wrapper = render(
        <SrpInput value={testValue} inputProps={{ testID: INPUT_TEST_ID }} />,
      );
      const input = wrapper.getByTestId(INPUT_TEST_ID);

      act(() => {
        fireEvent(input, 'focus');
      });

      expect(input.props.selection).toEqual({
        start: testValue.length,
        end: testValue.length,
      });
    });

    it('keeps selection at end of value on blur', () => {
      const testValue = 'test value';
      const wrapper = render(
        <SrpInput value={testValue} inputProps={{ testID: INPUT_TEST_ID }} />,
      );
      const input = wrapper.getByTestId(INPUT_TEST_ID);

      act(() => {
        fireEvent(input, 'focus');
      });

      act(() => {
        fireEvent(input, 'selectionChange', {
          nativeEvent: { selection: { start: 0, end: 0 } },
        });
      });

      act(() => {
        fireEvent(input, 'blur');
      });

      expect(input.props.selection).toEqual({
        start: testValue.length,
        end: testValue.length,
      });
    });

    it('places caret at end again after blur then focus', () => {
      const testValue = 'wallet';
      const wrapper = render(
        <SrpInput value={testValue} inputProps={{ testID: INPUT_TEST_ID }} />,
      );
      const input = wrapper.getByTestId(INPUT_TEST_ID);

      act(() => {
        fireEvent(input, 'focus');
      });
      act(() => {
        fireEvent(input, 'blur');
      });
      act(() => {
        fireEvent(input, 'focus');
      });

      expect(input.props.selection).toEqual({
        start: testValue.length,
        end: testValue.length,
      });
    });

    it('updates selection state on selection change', () => {
      const wrapper = render(
        <SrpInput value="test value" inputProps={{ testID: INPUT_TEST_ID }} />,
      );
      const input = wrapper.getByTestId(INPUT_TEST_ID);
      const mockSelection = { start: 5, end: 5 };

      act(() => {
        fireEvent(input, 'selectionChange', {
          nativeEvent: { selection: mockSelection },
        });
      });

      expect(input.props.selection).toEqual(mockSelection);
    });

    it('does not update selection when disabled on focus', () => {
      const wrapper = render(
        <SrpInput
          value="test"
          isDisabled
          inputProps={{ testID: INPUT_TEST_ID }}
        />,
      );
      const input = wrapper.getByTestId(INPUT_TEST_ID);

      const initialSelection = input.props.selection;

      act(() => {
        fireEvent(input, 'focus');
      });

      expect(input.props.selection).toBe(initialSelection);
    });

    it('calls provided onFocus callback when focused', () => {
      const mockOnFocus = jest.fn();
      const wrapper = render(
        <SrpInput
          value=""
          onFocus={mockOnFocus}
          inputProps={{ testID: INPUT_TEST_ID }}
        />,
      );
      const input = wrapper.getByTestId(INPUT_TEST_ID);

      act(() => {
        fireEvent(input, 'focus');
      });

      expect(mockOnFocus).toHaveBeenCalledTimes(1);
    });

    it('calls provided onBlur callback when blurred', () => {
      const mockOnBlur = jest.fn();
      const wrapper = render(
        <SrpInput
          value=""
          onBlur={mockOnBlur}
          inputProps={{ testID: INPUT_TEST_ID }}
        />,
      );
      const input = wrapper.getByTestId(INPUT_TEST_ID);

      act(() => {
        fireEvent(input, 'blur');
      });

      expect(mockOnBlur).toHaveBeenCalledTimes(1);
    });
  });
});
