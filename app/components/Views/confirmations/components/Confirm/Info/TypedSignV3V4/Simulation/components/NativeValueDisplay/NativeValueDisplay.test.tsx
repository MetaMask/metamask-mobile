import React from 'react';
import NativeValueDisplay from './NativeValueDisplay';
import { backgroundState } from '../../../../../../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../../../../../../util/test/renderWithProvider';
import { fireEvent } from '@testing-library/react-native';

const mockInitialState = {
  engine: {
    backgroundState,
  },
};

describe('NativeValueDisplay', () => {
  it('renders component correctly', async () => {
    const { findByText } = renderWithProvider(
      <NativeValueDisplay
        modalHeaderText={'Spending Cap'}
        value={'4321'}
        chainId={'0x1'}
      />,
      { state: mockInitialState },
    );

    expect(await findByText('< 0.000001')).toBeDefined();
    expect(await findByText('ETH')).toBeDefined();
  });

  it('displays modal when clicking on the value', async () => {
    const { findByText } = renderWithProvider(
      <NativeValueDisplay
        modalHeaderText={'Spending Cap'}
        value={'4321'}
        chainId={'0x1'}
      />,
      { state: mockInitialState },
    );

    const button = await findByText('< 0.000001');
    fireEvent.press(button);

    expect(await findByText('Spending Cap')).toBeDefined();
  });
});
