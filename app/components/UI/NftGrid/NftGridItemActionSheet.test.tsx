import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import NftGridItemActionSheet from './NftGridItemActionSheet';
import { Nft } from '@metamask/assets-controllers';
import { ToastContext } from '../../../component-library/components/Toast';
import { ToastRef } from '../../../component-library/components/Toast/Toast.types';

const mockStore = configureMockStore();

jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    themeAppearance: 'light',
    colors: {
      accent03: {
        dark: '#0f172a',
        normal: '#22c55e',
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
  const createToastRef = () =>
    ({
      current: {
        showToast: jest.fn(),
        closeToast: jest.fn(),
      },
    }) as React.RefObject<ToastRef>;

  const renderComponent = ({
    collectible = mockNft,
    toastRef = createToastRef(),
  }: {
    collectible?: Nft | null;
    toastRef?: React.RefObject<ToastRef>;
  }) => {
    const store = mockStore(createInitialState());

    return {
      toastRef,
      ...render(
        <Provider store={store}>
          <ToastContext.Provider value={{ toastRef }}>
            <NftGridItemActionSheet
              actionSheetRef={mockActionSheetRef}
              longPressedCollectible={collectible}
            />
          </ToastContext.Provider>
        </Provider>,
      ),
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders action sheet options', () => {
    const { getByText } = renderComponent({});

    expect(getByText('wallet.collectible_action_title')).toBeOnTheScreen();
    expect(getByText('wallet.refresh_metadata')).toBeOnTheScreen();
    expect(getByText('wallet.remove')).toBeOnTheScreen();
    expect(getByText('wallet.cancel')).toBeOnTheScreen();
  });

  it('refreshes metadata when refresh option is selected', () => {
    const { getByTestId } = renderComponent({});

    fireEvent.press(getByTestId('action-sheet-option-0'));

    expect(Engine.context.NftController.addNft).toHaveBeenCalledWith(
      '0x123',
      '456',
      'mainnet',
    );
  });

  it('removes NFT when remove option is selected', () => {
    const { getByTestId } = renderComponent({});

    fireEvent.press(getByTestId('action-sheet-option-1'));

    expect(
      Engine.context.NftController.removeAndIgnoreNft,
    ).toHaveBeenCalledWith('0x123', '456', 'mainnet');
  });

  it('shows removal toast when remove option is selected', () => {
    const toastRef = createToastRef();

    const { getByTestId } = renderComponent({ toastRef });

    fireEvent.press(getByTestId('action-sheet-option-1'));

    expect(toastRef.current?.showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [
          {
            label: 'wallet.collectible_removed_title',
            isBold: true,
          },
        ],
        descriptionOptions: {
          description: 'wallet.collectible_removed_desc',
        },
      }),
    );
  });
});
