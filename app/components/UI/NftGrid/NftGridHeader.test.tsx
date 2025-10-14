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

// Mock BaseControlBar
jest.mock('../shared/BaseControlBar', () => {
  const { View } = jest.requireActual('react-native');
  return ({ additionalButtons }: { additionalButtons?: React.ReactNode }) => (
    <View testID="base-control-bar">{additionalButtons}</View>
  );
});

// Mock useStyles hook
jest.mock('../../hooks/useStyles', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      controlIconButton: {},
    },
  })),
}));

// Mock ButtonIcon and its enums
jest.mock('../../../component-library/components/Buttons/ButtonIcon', () => {
  const { TouchableOpacity } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      onPress,
      testID,
      disabled,
    }: {
      onPress: () => void;
      testID?: string;
      disabled?: boolean;
    }) => (
      <TouchableOpacity testID={testID} onPress={onPress} disabled={disabled} />
    ),
    ButtonIconSizes: {
      Sm: 'Sm',
      Md: 'Md',
      Lg: 'Lg',
    },
  };
});

// Mock Icon and IconName
jest.mock('../../../component-library/components/Icons/Icon', () => ({
  IconName: {
    Add: 'Add',
  },
}));

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
  const mockGoToAddCollectible = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows banner when on mainnet and NFT detection is disabled', () => {
    mockSelectProviderType.mockReturnValue(MAINNET);
    mockSelectUseNftDetection.mockReturnValue(false);
    const store = mockStore(createInitialState());

    const { getByTestId } = render(
      <Provider store={store}>
        <NftGridHeader
          isAddNFTEnabled
          goToAddCollectible={mockGoToAddCollectible}
        />
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
        <NftGridHeader
          isAddNFTEnabled
          goToAddCollectible={mockGoToAddCollectible}
        />
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
        <NftGridHeader
          isAddNFTEnabled
          goToAddCollectible={mockGoToAddCollectible}
        />
      </Provider>,
    );

    expect(queryByTestId('collectible-detection-modal')).toBeNull();
  });

  it('disables add NFT button when isAddNFTEnabled is false', () => {
    // Arrange
    mockSelectProviderType.mockReturnValue(MAINNET);
    mockSelectUseNftDetection.mockReturnValue(false);
    const store = mockStore(createInitialState());

    // Act
    const { getByTestId } = render(
      <Provider store={store}>
        <NftGridHeader
          isAddNFTEnabled={false}
          goToAddCollectible={mockGoToAddCollectible}
        />
      </Provider>,
    );

    // Assert
    const addButton = getByTestId('import-token-button');
    expect(addButton.props.disabled).toBe(true);
  });

  it('calls goToAddCollectible when add NFT button is pressed', () => {
    // Arrange
    mockSelectProviderType.mockReturnValue(MAINNET);
    mockSelectUseNftDetection.mockReturnValue(false);
    const store = mockStore(createInitialState());

    // Act
    const { getByTestId } = render(
      <Provider store={store}>
        <NftGridHeader
          isAddNFTEnabled
          goToAddCollectible={mockGoToAddCollectible}
        />
      </Provider>,
    );

    const addButton = getByTestId('import-token-button');
    addButton.props.onPress();

    // Assert
    expect(mockGoToAddCollectible).toHaveBeenCalledTimes(1);
  });
});
