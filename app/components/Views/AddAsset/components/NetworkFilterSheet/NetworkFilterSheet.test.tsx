import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import NetworkFilterSheet from './NetworkFilterSheet';

const mockOnSelect = jest.fn();
let mockSelectedNetwork: string | null = null;
jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
  useParams: () => ({
    selectedNetwork: mockSelectedNetwork,
    onSelect: mockOnSelect,
  }),
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { forwardRef, useImperativeHandle } = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return forwardRef(
      (
        { children }: { children: React.ReactNode },
        ref: React.Ref<unknown>,
      ) => {
        useImperativeHandle(ref, () => ({
          onCloseBottomSheet: (cb?: () => void) => cb?.(),
        }));
        return <View>{children}</View>;
      },
    );
  },
);

const renderSheet = () =>
  renderWithProvider(<NetworkFilterSheet />, {
    state: { engine: { backgroundState } },
  });

describe('NetworkFilterSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedNetwork = null;
  });

  it('lists popular networks and the supported networks', () => {
    const { getByText, getByTestId } = renderSheet();

    expect(getByText('Popular networks')).toBeOnTheScreen();
    expect(getByTestId('network-select-eip155:1')).toBeOnTheScreen();
    expect(getByTestId('network-select-eip155:8453')).toBeOnTheScreen();
  });

  it('reports the chosen network as a single chain id', () => {
    const { getByTestId } = renderSheet();

    fireEvent.press(getByTestId('network-select-eip155:8453'));

    expect(mockOnSelect).toHaveBeenCalledWith('eip155:8453');
  });

  it('reports null when popular networks is chosen', () => {
    mockSelectedNetwork = 'eip155:1';
    const { getByText } = renderSheet();

    fireEvent.press(getByText('Popular networks'));

    expect(mockOnSelect).toHaveBeenCalledWith(null);
  });
});
