import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { DepositKeyboard, DepositKeyboardProps } from './deposit-keyboard';
import { merge, noop } from 'lodash';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { KeypadTestIds } from '../../../../Base/Keypad/Keypad.testIds';

function render(props: Partial<DepositKeyboardProps> = {}) {
  return renderWithProvider(
    <DepositKeyboard
      onChange={noop}
      onDonePress={noop}
      onPercentagePress={noop}
      value="0"
      {...props}
    />,
    {
      state: merge({}, otherControllersMock),
    },
  );
}

describe('DepositKeyboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onChange when digit pressed', () => {
    const onChangeMock = jest.fn();

    const { getByText } = render({ onChange: onChangeMock });

    fireEvent.press(getByText('1'));

    expect(onChangeMock).toHaveBeenCalledWith('1');
  });

  it('edits from the amount as displayed when the value carries full precision', () => {
    // Max stores the exact balance, so editing the raw value would make the
    // user backspace away hidden decimals before the displayed amount moved.
    const onChangeMock = jest.fn();

    const { getByTestId } = render({
      onChange: onChangeMock,
      value: '50.389',
    });

    fireEvent.press(getByTestId(KeypadTestIds.DELETE_BUTTON));

    expect(onChangeMock).toHaveBeenCalledWith('50.3');
  });

  it('drops the hidden decimals when a digit is rejected at the decimal cap', () => {
    // The digit is still refused, since the displayed amount is already at
    // two decimals, but the value it reports back no longer carries the
    // precision the user cannot see.
    const onChangeMock = jest.fn();

    const { getByText } = render({ onChange: onChangeMock, value: '50.3891' });

    fireEvent.press(getByText('7'));

    expect(onChangeMock).toHaveBeenCalledWith('50.38');
  });

  it('hides done button if input is empty', () => {
    const { queryByTestId } = render();
    expect(queryByTestId('deposit-keyboard-done-button')).toBeNull();
  });

  it('shows done button if hasInput set', () => {
    const { getByTestId } = render({
      hasInput: true,
      value: '1',
    });

    expect(getByTestId('deposit-keyboard-done-button')).toBeDefined();
  });

  it('calls onDone when done button pressed', () => {
    const onDonePressMock = jest.fn();

    const { getByTestId } = render({
      onDonePress: onDonePressMock,
      hasInput: true,
      value: '1',
    });

    fireEvent.press(getByTestId('deposit-keyboard-done-button'));

    expect(onDonePressMock).toHaveBeenCalled();
  });

  it('calls onPercentagePress when percentage button pressed', () => {
    const onPercentagePressMock = jest.fn();

    const { getByText } = render({ onPercentagePress: onPercentagePressMock });

    fireEvent.press(getByText('50%'));

    expect(onPercentagePressMock).toHaveBeenCalled();
  });

  it('disables the done button when isDoneDisabled is set', () => {
    const onDonePressMock = jest.fn();

    const { getByTestId } = render({
      hasInput: true,
      isDoneDisabled: true,
      onDonePress: onDonePressMock,
      value: '1',
    });

    fireEvent.press(getByTestId('deposit-keyboard-done-button'));

    expect(onDonePressMock).not.toHaveBeenCalled();
  });

  it('renders doneLabel if specified', async () => {
    const { getByText } = render({
      doneLabel: 'Test Button',
      hasInput: true,
    });

    expect(getByText('Test Button')).toBeDefined();
  });

  it('renders max button if hasMax', () => {
    const { getByText } = render({
      hasMax: true,
    });

    expect(getByText('Max')).toBeDefined();
  });

  it('renders 90% button if hasMax is false', () => {
    const { getByText } = render({
      hasMax: false,
    });

    expect(getByText('90%')).toBeDefined();
  });

  it('hides percentage buttons when hidePercentageButtons is true', () => {
    const { queryByText } = render({
      hidePercentageButtons: true,
    });

    expect(queryByText('10%')).toBeNull();
    expect(queryByText('25%')).toBeNull();
    expect(queryByText('50%')).toBeNull();
    expect(queryByText('90%')).toBeNull();
  });
});
