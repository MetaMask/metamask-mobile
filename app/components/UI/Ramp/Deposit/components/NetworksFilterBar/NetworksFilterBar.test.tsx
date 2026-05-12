import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import NetworksFilterBar from './NetworksFilterBar';
import { CaipChainId } from '@metamask/utils';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import initialRootState from '../../../../../../util/test/initial-root-state';

function render(component: React.ReactElement) {
  return renderWithProvider(component, {
    state: initialRootState,
  });
}

describe('NetworksFilterBar', () => {
  const networks: CaipChainId[] = ['eip155:1', 'eip155:59144', 'eip155:56'];
  const mockSetNetworkFilter = jest.fn();
  const mockSetIsEditingNetworkFilter = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the All networks button when networkFilter is null', () => {
    const { getByText } = render(
      <NetworksFilterBar
        networks={networks}
        networkFilter={null}
        setNetworkFilter={mockSetNetworkFilter}
        setIsEditingNetworkFilter={mockSetIsEditingNetworkFilter}
      />,
    );

    expect(getByText('All networks')).toBeOnTheScreen();

    fireEvent.press(getByText('All networks'));

    expect(mockSetNetworkFilter).toHaveBeenCalledWith(networks);
    expect(mockSetIsEditingNetworkFilter).toHaveBeenCalledWith(true);
  });

  it('renders the All networks button when networkFilter equals all networks', () => {
    const { getByText } = render(
      <NetworksFilterBar
        networks={networks}
        networkFilter={networks}
        setNetworkFilter={mockSetNetworkFilter}
        setIsEditingNetworkFilter={mockSetIsEditingNetworkFilter}
      />,
    );

    expect(getByText('All networks')).toBeOnTheScreen();

    fireEvent.press(getByText('All networks'));

    expect(mockSetNetworkFilter).toHaveBeenCalledWith(networks);
    expect(mockSetIsEditingNetworkFilter).toHaveBeenCalledWith(true);
  });

  it('renders individual network buttons with See all when networkFilter is a subset and removes selection', () => {
    const subsetNetworkFilter: CaipChainId[] = ['eip155:1', 'eip155:59144'];
    const { getByText } = render(
      <NetworksFilterBar
        networks={networks}
        networkFilter={subsetNetworkFilter}
        setNetworkFilter={mockSetNetworkFilter}
        setIsEditingNetworkFilter={mockSetIsEditingNetworkFilter}
      />,
    );

    expect(getByText('See all')).toBeOnTheScreen();
    expect(getByText('Ethereum')).toBeOnTheScreen();

    fireEvent.press(getByText('Ethereum'));

    expect(mockSetNetworkFilter).toHaveBeenCalled();
    const setterFunction = mockSetNetworkFilter.mock.calls[0][0];
    expect(setterFunction(subsetNetworkFilter)).toEqual(['eip155:59144']);
  });

  it('replaces networkFilter when only one network is selected', () => {
    const singleNetworkFilter: CaipChainId[] = ['eip155:1'];
    const { getByText } = render(
      <NetworksFilterBar
        networks={networks}
        networkFilter={singleNetworkFilter}
        setNetworkFilter={mockSetNetworkFilter}
        setIsEditingNetworkFilter={mockSetIsEditingNetworkFilter}
      />,
    );

    const lineaButton = getByText('Linea');
    fireEvent.press(lineaButton);

    expect(mockSetNetworkFilter).toHaveBeenCalledWith(['eip155:59144']);
  });
});
