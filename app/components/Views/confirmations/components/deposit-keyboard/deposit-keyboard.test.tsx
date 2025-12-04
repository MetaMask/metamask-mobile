import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { DepositKeyboard, DepositKeyboardProps } from './deposit-keyboard';
import { merge, noop } from 'lodash';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';

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
  it('calls onChange when digit pressed', () => {
    const onChangeMock = jest.fn();

    const { getByText } = render({ onChange: onChangeMock });

    fireEvent.press(getByText('1'));

    expect(onChangeMock).toHaveBeenCalledWith('1');
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

  it('renders alert and no percentage or done button', () => {
    const { getByText, queryByTestId, queryByText } = render({
      alertMessage: 'Test Alert',
      value: '1',
    });

    expect(getByText('Test Alert')).toBeDefined();
    expect(queryByTestId('deposit-keyboard-done-button')).toBeNull();
    expect(queryByText('50%')).toBeNull();
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
});
