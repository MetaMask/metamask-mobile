import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import NetworkOptionCells from './NetworkOptionCells';

const networks = [
  { caipChainId: 'eip155:1', name: 'Ethereum', imageSource: 1 },
  { caipChainId: 'eip155:8453', name: 'Base', imageSource: 2 },
] as React.ComponentProps<typeof NetworkOptionCells>['networks'];

const renderCells = (
  props: Partial<React.ComponentProps<typeof NetworkOptionCells>> = {},
) => {
  const onSelect = jest.fn();
  const utils = renderWithProvider(
    <NetworkOptionCells
      networks={networks}
      allLabel="All"
      selectedChainIds={null}
      onSelect={onSelect}
      {...props}
    />,
  );
  return { ...utils, onSelect };
};

describe('NetworkOptionCells', () => {
  it('renders the all row and every network', () => {
    const { getByText } = renderCells();

    expect(getByText('All')).toBeOnTheScreen();
    expect(getByText('Ethereum')).toBeOnTheScreen();
    expect(getByText('Base')).toBeOnTheScreen();
  });

  it('hides the all row when no label is given', () => {
    const { queryByText } = renderCells({ allLabel: undefined });

    expect(queryByText('All')).toBeNull();
  });

  it('selects a single network', () => {
    const { getByTestId, onSelect } = renderCells();

    fireEvent.press(getByTestId('network-select-eip155:8453'));

    expect(onSelect).toHaveBeenCalledWith(['eip155:8453']);
  });

  it('selects all networks with null', () => {
    const { getByText, onSelect } = renderCells({
      selectedChainIds: ['eip155:1'],
    });

    fireEvent.press(getByText('All'));

    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
