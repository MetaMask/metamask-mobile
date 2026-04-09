// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// Internal dependencies.
import SrpInput from './index';
import {
  TEXTFIELD_TEST_ID,
  TEXTFIELD_STARTACCESSORY_TEST_ID,
  TEXTFIELD_ENDACCESSORY_TEST_ID,
} from '../../../component-library/components/Form/TextField/TextField.constants';
import { act, fireEvent, render } from '@testing-library/react-native';
import Device from '../../../util/device';

jest.mock('../../../util/device');

const INPUT_TEST_ID = 'testingInputID';
describe('SrpInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders default settings correctly', () => {
    const wrapper = render(<SrpInput />);

    expect(wrapper).toMatchSnapshot();
  });

  it('renders SrpInput', () => {
    const wrapper = render(<SrpInput />);

    const textFieldComponent = wrapper.getByTestId(TEXTFIELD_TEST_ID);

    expect(textFieldComponent).toBeOnTheScreen();
  });

  it('renders the startAccessory when provided', () => {
    const wrapper = render(
      <SrpInput startAccessory={<View />} testID={INPUT_TEST_ID} />,
    );

    const textFieldComponent = wrapper.getByTestId(
      TEXTFIELD_STARTACCESSORY_TEST_ID,
    );

    expect(textFieldComponent).toBeOnTheScreen();
  });

  it('renders the endAccessory when provided', () => {
    const wrapper = render(
      <SrpInput endAccessory={<View />} testID={INPUT_TEST_ID} />,
    );

    const textFieldComponent = wrapper.getByTestId(
      TEXTFIELD_ENDACCESSORY_TEST_ID,
    );

    expect(textFieldComponent).toBeOnTheScreen();
  });

  describe('selection updates', () => {
    describe('Android', () => {
      beforeEach(() => {
        (Device.isAndroid as jest.Mock).mockReturnValue(true);
      });

      it('sets selection to end of value on focus', () => {
        const testValue = 'test recovery phrase';
        const wrapper = render(
          <SrpInput value={testValue} testID={INPUT_TEST_ID} />,
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

      it('sets selection to beginning on blur', () => {
        const wrapper = render(
          <SrpInput value="test value" testID={INPUT_TEST_ID} />,
        );
        const input = wrapper.getByTestId(INPUT_TEST_ID);

        act(() => {
          fireEvent(input, 'focus');
        });

        act(() => {
          fireEvent(input, 'blur');
        });

        expect(input.props.selection).toEqual({
          start: 0,
          end: 0,
        });
      });

      it('updates selection state on selection change', () => {
        const wrapper = render(
          <SrpInput value="test value" testID={INPUT_TEST_ID} />,
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
          <SrpInput value="test" isDisabled testID={INPUT_TEST_ID} />,
        );
        const input = wrapper.getByTestId(INPUT_TEST_ID);

        const initialSelection = input.props.selection;

        act(() => {
          fireEvent(input, 'focus');
        });

        expect(input.props.selection).toBe(initialSelection);
      });
    });

    describe('iOS', () => {
      beforeEach(() => {
        (Device.isAndroid as jest.Mock).mockReturnValue(false);
      });

      it('does not set selection on focus', () => {
        const testValue = 'test recovery phrase';
        const wrapper = render(
          <SrpInput value={testValue} testID={INPUT_TEST_ID} />,
        );
        const input = wrapper.getByTestId(INPUT_TEST_ID);

        act(() => {
          fireEvent(input, 'focus');
        });

        expect(input.props.selection).toBeUndefined();
      });

      it('does not set selection on blur', () => {
        const wrapper = render(
          <SrpInput value="test value" testID={INPUT_TEST_ID} />,
        );
        const input = wrapper.getByTestId(INPUT_TEST_ID);

        act(() => {
          fireEvent(input, 'focus');
        });

        act(() => {
          fireEvent(input, 'blur');
        });

        expect(input.props.selection).toBeUndefined();
      });

      it('does not update selection on selection change', () => {
        const wrapper = render(
          <SrpInput value="test value" testID={INPUT_TEST_ID} />,
        );
        const input = wrapper.getByTestId(INPUT_TEST_ID);
        const mockSelection = { start: 5, end: 5 };

        act(() => {
          fireEvent(input, 'selectionChange', {
            nativeEvent: { selection: mockSelection },
          });
        });

        expect(input.props.selection).toBeUndefined();
      });
    });

    describe('callbacks', () => {
      it('calls provided onFocus callback when focused', () => {
        const mockOnFocus = jest.fn();
        const wrapper = render(
          <SrpInput onFocus={mockOnFocus} testID={INPUT_TEST_ID} />,
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
          <SrpInput onBlur={mockOnBlur} testID={INPUT_TEST_ID} />,
        );
        const input = wrapper.getByTestId(INPUT_TEST_ID);

        act(() => {
          fireEvent(input, 'blur');
        });

        expect(mockOnBlur).toHaveBeenCalledTimes(1);
      });
    });
  });
});
