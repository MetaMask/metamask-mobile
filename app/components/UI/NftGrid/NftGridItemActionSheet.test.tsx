import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import NftGridItemActionSheet from './NftGridItemActionSheet';
import { Nft } from '@metamask/assets-controllers';

const mockStore = configureMockStore();

// Create mock for showToast function
const mockShowToast = jest.fn();

// Mock Toast component with a functional context that uses the mockShowToast
jest.mock('../../../component-library/components/Toast', () => {
  const ReactActual = jest.requireActual('react');
  const MockToastContext = ReactActual.createContext({
    toastRef: { current: { showToast: (...args: unknown[]) => mockShowToast(...args) } },
  });
  return {
    ToastContext: MockToastContext,
    ToastVariants: {
      Icon: 'Icon',
    },
  };
});

jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    themeAppearance: 'light',
    colors: {
      success: {
        default: '#28a745',
        muted: '#d4edda',
      },
    },
  }),
}));

jest.mock('../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn(() => ({
        build: jest.fn(),
      })),
    })),
  }),
  MetaMetricsEvents: {
    COLLECTIBLE_REMOVED: 'collectible_removed',
  },
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    NftController: {
      removeAndIgnoreNft: jest.fn(),
      addNft: jest.fn(),
    },
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn().mockReturnValue('mainnet'),
    },
  },
}));

jest.mock('../../../util/networks', () => ({
  getDecimalChainId: jest.fn(() => '1'),
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('@metamask/react-native-actionsheet', () => {
  const { forwardRef } = jest.requireActual('react');
  return forwardRef(
    (
      {
        title,
        options,
        onPress,
        testID,
      }: {
        title: string;
        options: string[];
        onPress: (index: number) => void;
        testID?: string;
      },
      _ref: unknown,
    ) => {
      const { View, Text, TouchableOpacity } =
        jest.requireActual('react-native');
      return (
        <View testID={testID || 'action-sheet'}>
          <Text>{title}</Text>
          {options.map((option: string, index: number) => (
            <TouchableOpacity
              key={index}
              testID={`action-sheet-option-${index}`}
              onPress={() => onPress(index)}
            >
              <Text>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    },
  );
});

import Engine from '../../../core/Engine';

describe('NftGridItemActionSheet', () => {
  const mockNft: Nft = {
    address: '0x123',
    tokenId: '456',
    name: 'Test NFT',
    image: 'https://example.com/nft.png',
    collection: { name: 'Test Collection' },
    chainId: 1,
    isCurrentlyOwned: true,
    standard: 'ERC721',
  } as Nft;

  const mockActionSheetRef = { current: null };
  const createInitialState = () => ({});

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders action sheet with correct options', () => {
    const store = mockStore(createInitialState());

    const { getByText } = render(
      <Provider store={store}>
        <NftGridItemActionSheet
          actionSheetRef={mockActionSheetRef}
          longPressedCollectible={mockNft}
        />
      </Provider>,
    );

    expect(getByText('wallet.collectible_action_title')).toBeDefined();
    expect(getByText('wallet.refresh_metadata')).toBeDefined();
    expect(getByText('wallet.remove')).toBeDefined();
    expect(getByText('wallet.cancel')).toBeDefined();
  });

  it('refreshes metadata when refresh option is selected', () => {
    const store = mockStore(createInitialState());

    const { getByTestId } = render(
      <Provider store={store}>
        <NftGridItemActionSheet
          actionSheetRef={mockActionSheetRef}
          longPressedCollectible={mockNft}
        />
      </Provider>,
    );

    fireEvent.press(getByTestId('action-sheet-option-0'));

    expect(Engine.context.NftController.addNft).toHaveBeenCalledWith(
      '0x123',
      '456',
      'mainnet',
    );
  });

  it('removes NFT when remove option is selected', () => {
    const store = mockStore(createInitialState());

    const { getByTestId } = render(
      <Provider store={store}>
        <NftGridItemActionSheet
          actionSheetRef={mockActionSheetRef}
          longPressedCollectible={mockNft}
        />
      </Provider>,
    );

    fireEvent.press(getByTestId('action-sheet-option-1'));

    expect(
      Engine.context.NftController.removeAndIgnoreNft,
    ).toHaveBeenCalledWith('0x123', '456', 'mainnet');

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'Icon',
        labelOptions: [{ label: 'wallet.collectible_removed_title' }],
      }),
    );
  });
});
