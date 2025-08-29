import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { noop } from 'lodash';
import { View } from 'react-native';

import Text from '../../../../../component-library/components/Texts/Text';
import { EditAmountKeyboard } from './edit-amount-keyboard';

describe('EditAmountKeyboard', () => {
  it('calls onChange when digit pressed', () => {
    const onChangeMock = jest.fn();

    const { getByText } = render(
      <EditAmountKeyboard
        onChange={onChangeMock}
        onDonePress={noop}
        onPercentagePress={noop}
        value={'0'}
      />,
    );

    const digitButton = getByText('1');
    fireEvent.press(digitButton);

    expect(onChangeMock).toHaveBeenCalledWith('1');
  });

  it('calls onDone when done button pressed', () => {
    const onDonePressMock = jest.fn();

    const { getByText } = render(
      <EditAmountKeyboard
        onChange={noop}
        onDonePress={onDonePressMock}
        onPercentagePress={noop}
        value={'0'}
      />,
    );

    const doneButton = getByText('Done');
    fireEvent.press(doneButton);

    expect(onDonePressMock).toHaveBeenCalled();
  });

  it('done button is visible only if hideDoneButton is false and onDonePress is defined', () => {
    const { queryByText } = render(
      <EditAmountKeyboard
        onChange={noop}
        onPercentagePress={noop}
        value={'0'}
        hideDoneButton
      />,
    );

    expect(queryByText('Done')).toBeNull();
  });

  it('calls onPercentagePress when percentage button pressed', () => {
    const onPercentagePressMock = jest.fn();

    const { getByText } = render(
      <EditAmountKeyboard
        onChange={noop}
        onDonePress={noop}
        onPercentagePress={onPercentagePressMock}
        value={'0'}
      />,
    );

    const percentageButton = getByText('50%');
    fireEvent.press(percentageButton);

    expect(onPercentagePressMock).toHaveBeenCalled();
  });

  it('render additionalButtons pased in the props', () => {
    const onPercentagePressMock = jest.fn();

    const { getByText } = render(
      <EditAmountKeyboard
        onChange={noop}
        onDonePress={noop}
        onPercentagePress={onPercentagePressMock}
        value={'0'}
        additionalButtons={[{ value: 100, label: 'Max' }]}
      />,
    );

    expect(getByText('Max')).toBeDefined();
    expect(getByText('Done')).toBeDefined();
  });

  it('does not render additional buttons if showAdditionalKeyboard is false', () => {
    const onPercentagePressMock = jest.fn();

    const { queryByText } = render(
      <EditAmountKeyboard
        onChange={noop}
        onDonePress={noop}
        onPercentagePress={onPercentagePressMock}
        value={'0'}
        showAdditionalKeyboard={false}
      />,
    );

    expect(queryByText('25%')).toBeNull();
    expect(queryByText('50%')).toBeNull();
    expect(queryByText('Done')).toBeNull();
  });

  it('render additional rows passed in additionalRow prop', () => {
    const onPercentagePressMock = jest.fn();

    const { getByText } = render(
      <EditAmountKeyboard
        onChange={noop}
        onDonePress={noop}
        onPercentagePress={onPercentagePressMock}
        value={'0'}
        showAdditionalKeyboard={false}
        additionalRow={
          <View>
            <Text>Additional Row</Text>
          </View>
        }
      />,
    );

    expect(getByText('Additional Row')).toBeDefined();
  });
});
