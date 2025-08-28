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
      hasInput={false}
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

  it('hides done button if hasInput is false', () => {
    const { queryByTestId } = render();
    expect(queryByTestId('deposit-keyboard-done-button')).toBeNull();
  });

  it('shows done button if hasInput', () => {
    const { getByTestId, getByText } = render({ hasInput: true });

    fireEvent.press(getByText('1'));

    expect(getByTestId('deposit-keyboard-done-button')).toBeDefined();
  });

  it('calls onDone when done button pressed', () => {
    const onDonePressMock = jest.fn();

    const { getByTestId } = render({
      hasInput: true,
      onDonePress: onDonePressMock,
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
});
