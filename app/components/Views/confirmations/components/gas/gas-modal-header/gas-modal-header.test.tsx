import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { noop } from 'lodash';

import { GasModalHeader } from './gas-modal-header';

describe('GasModalHeader', () => {
  it('renders the back button and title', () => {
    const { getByText, getByTestId } = render(
      <GasModalHeader onBackButtonClick={noop} title="Gas Fee Title" />,
    );

    expect(getByTestId('back-button')).toBeOnTheScreen();
    expect(getByText('Gas Fee Title')).toBeOnTheScreen();
  });

  it('calls onBackButtonClick when the back button is pressed', () => {
    const onBackButtonClick = jest.fn();
    const { getByTestId } = render(
      <GasModalHeader
        onBackButtonClick={onBackButtonClick}
        title="Gas Fee Title"
      />,
    );

    fireEvent.press(getByTestId('back-button'));

    expect(onBackButtonClick).toHaveBeenCalled();
  });
});
