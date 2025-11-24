import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import NftGridHeader from './NftGridHeader';
import { MAINNET } from '../../../constants/network';

const mockStore = configureMockStore();

// Mock the selectors
jest.mock('../../../selectors/networkController', () => ({
  selectProviderType: jest.fn(),
}));

jest.mock('../../../selectors/preferencesController', () => ({
  selectUseNftDetection: jest.fn(),
}));

// Mock CollectibleDetectionModal
jest.mock('../CollectibleDetectionModal', () => {
  const { View, Text } = jest.requireActual('react-native');
  return () => (
    <View testID="collectible-detection-modal">
      <Text>NFT Detection Banner</Text>
    </View>
  );
});

// Import the mocked selectors to control their return values
import { selectProviderType } from '../../../selectors/networkController';
import { selectUseNftDetection } from '../../../selectors/preferencesController';

const mockSelectProviderType = selectProviderType as jest.MockedFunction<
  typeof selectProviderType
>;
const mockSelectUseNftDetection = selectUseNftDetection as jest.MockedFunction<
  typeof selectUseNftDetection
>;

describe('NftGridHeader', () => {
  const createInitialState = () => ({});

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows banner when on mainnet and NFT detection is disabled', () => {
    mockSelectProviderType.mockReturnValue(MAINNET);
    mockSelectUseNftDetection.mockReturnValue(false);
    const store = mockStore(createInitialState());

    const { getByTestId } = render(
      <Provider store={store}>
        <NftGridHeader />
      </Provider>,
    );

    expect(getByTestId('collectible-detection-modal')).toBeDefined();
  });

  it('hides banner when NFT detection is enabled', () => {
    mockSelectProviderType.mockReturnValue(MAINNET);
    mockSelectUseNftDetection.mockReturnValue(true);
    const store = mockStore(createInitialState());

    const { queryByTestId } = render(
      <Provider store={store}>
        <NftGridHeader />
      </Provider>,
    );

    expect(queryByTestId('collectible-detection-modal')).toBeNull();
  });

  it('hides banner when not on mainnet', () => {
    mockSelectProviderType.mockReturnValue('sepolia');
    mockSelectUseNftDetection.mockReturnValue(false);
    const store = mockStore(createInitialState());

    const { queryByTestId } = render(
      <Provider store={store}>
        <NftGridHeader />
      </Provider>,
    );

    expect(queryByTestId('collectible-detection-modal')).toBeNull();
  });
});
