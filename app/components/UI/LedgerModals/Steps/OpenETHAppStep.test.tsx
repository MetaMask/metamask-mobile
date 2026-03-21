import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import OpenETHAppStep from './OpenETHAppStep';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { OPEN_ETH_APP_STEP } from './Steps.constants';
import { strings } from '../../../../../locales/i18n';

describe('OpenETHAppStep', () => {
  it('renders correctly', () => {
    const { getByTestId } = renderWithProvider(
      <OpenETHAppStep onReject={jest.fn()} />,
    );
    expect(getByTestId(OPEN_ETH_APP_STEP)).toBeTruthy();
  });

  it('calls onReject when reject button is pressed', () => {
    const onReject = jest.fn();
    const { getByText } = renderWithProvider(
      <OpenETHAppStep onReject={onReject} />,
    );

    const rejectButton = getByText(strings('transaction.reject'));
    fireEvent.press(rejectButton);
    expect(onReject).toHaveBeenCalled();
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithProvider(
      <OpenETHAppStep onReject={jest.fn()} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
