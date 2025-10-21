import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import NetworksFilterSelector from './NetworksFilterSelector';
import { CaipChainId } from '@metamask/utils';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import initialRootState from '../../../../../../util/test/initial-root-state';

function render(component: React.ReactElement) {
  return renderWithProvider(component, {
    state: initialRootState,
  });
}

describe('NetworksFilterSelector', () => {
  const networks: CaipChainId[] = ['eip155:1', 'eip155:59144', 'eip155:56'];
  const mockSetNetworkFilter = jest.fn();
  const mockSetIsEditingNetworkFilter = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when networkFilter is null', () => {
    const { toJSON, getByTestId } = render(
      <NetworksFilterSelector
        networks={networks}
        networkFilter={null}
        setNetworkFilter={mockSetNetworkFilter}
        setIsEditingNetworkFilter={mockSetIsEditingNetworkFilter}
      />,
    );

    expect(toJSON()).toMatchSnapshot();

    const selectAllButton = getByTestId('select-deselect-all-networks-button');
    fireEvent.press(selectAllButton);

    expect(mockSetNetworkFilter).toHaveBeenCalledWith(networks);
  });

  it('renders correctly when networkFilter is the same as uniqueNetworks', () => {
    const { toJSON, getByTestId } = render(
      <NetworksFilterSelector
        networks={networks}
        networkFilter={networks}
        setNetworkFilter={mockSetNetworkFilter}
        setIsEditingNetworkFilter={mockSetIsEditingNetworkFilter}
      />,
    );

    expect(toJSON()).toMatchSnapshot();

    const deselectAllButton = getByTestId(
      'select-deselect-all-networks-button',
    );
    fireEvent.press(deselectAllButton);

    expect(mockSetNetworkFilter).toHaveBeenCalledWith([]);
  });

  it('renders correctly when networkFilter is a subset of uniqueNetworks', () => {
    const subsetNetworkFilter: CaipChainId[] = ['eip155:1', 'eip155:59144'];
    const { toJSON, getByText } = render(
      <NetworksFilterSelector
        networks={networks}
        networkFilter={subsetNetworkFilter}
        setNetworkFilter={mockSetNetworkFilter}
        setIsEditingNetworkFilter={mockSetIsEditingNetworkFilter}
      />,
    );

    expect(toJSON()).toMatchSnapshot();

    const ethereumCheckbox = getByText('Ethereum');
    fireEvent.press(ethereumCheckbox);

    expect(mockSetNetworkFilter).toHaveBeenCalled();
    const setterFunction = mockSetNetworkFilter.mock.calls[0][0];
    expect(setterFunction(subsetNetworkFilter)).toEqual(['eip155:59144']);

    mockSetNetworkFilter.mockClear();

    const bscCheckbox = getByText('BNB Smart Chain');
    fireEvent.press(bscCheckbox);
    expect(mockSetNetworkFilter).toHaveBeenCalled();
    const updatedSetterFunction = mockSetNetworkFilter.mock.calls[0][0];
    expect(updatedSetterFunction(subsetNetworkFilter)).toEqual([
      'eip155:1',
      'eip155:59144',
      'eip155:56',
    ]);
  });

  it('applies the filter and closes the selector if all items are selected', () => {
    const { getByTestId } = render(
      <NetworksFilterSelector
        networks={networks}
        networkFilter={networks}
        setNetworkFilter={mockSetNetworkFilter}
        setIsEditingNetworkFilter={mockSetIsEditingNetworkFilter}
      />,
    );

    const applyButton = getByTestId('apply-networks-filter-button');
    fireEvent.press(applyButton);

    expect(mockSetNetworkFilter).toHaveBeenCalledWith(null);
    expect(mockSetIsEditingNetworkFilter).toHaveBeenCalledWith(false);
  });

  it('applies the filter and closes the selector if no items are selected', () => {
    const { getByTestId } = render(
      <NetworksFilterSelector
        networks={networks}
        networkFilter={[]}
        setNetworkFilter={mockSetNetworkFilter}
        setIsEditingNetworkFilter={mockSetIsEditingNetworkFilter}
      />,
    );

    const applyButton = getByTestId('apply-networks-filter-button');
    fireEvent.press(applyButton);

    expect(mockSetNetworkFilter).toHaveBeenCalledWith(null);
    expect(mockSetIsEditingNetworkFilter).toHaveBeenCalledWith(false);
  });

  it('applies the filter and closes the selector if some items are selected', () => {
    const { getByTestId } = render(
      <NetworksFilterSelector
        networks={networks}
        networkFilter={['eip155:1']}
        setNetworkFilter={mockSetNetworkFilter}
        setIsEditingNetworkFilter={mockSetIsEditingNetworkFilter}
      />,
    );

    const applyButton = getByTestId('apply-networks-filter-button');
    fireEvent.press(applyButton);

    expect(mockSetNetworkFilter).not.toHaveBeenCalled();
    expect(mockSetIsEditingNetworkFilter).toHaveBeenCalledWith(false);
  });
});
