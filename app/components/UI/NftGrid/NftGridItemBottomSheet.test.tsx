import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import NftGridItemBottomSheet from './NftGridItemBottomSheet';
import { Nft } from '@metamask/assets-controllers';
import Engine from '../../../core/Engine';

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Modal: ({
    children,
    visible,
  }: {
    children: React.ReactNode;
    visible: boolean;
  }) => {
    const { View } = jest.requireActual('react-native');
    return visible ? <View>{children}</View> : null;
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

jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { forwardRef } = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    Box: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
    BottomSheet: forwardRef(
      (
        {
          children,
          onClose,
        }: { children: React.ReactNode; onClose?: () => void },
        ref: React.Ref<{ onCloseBottomSheet: () => void }>,
      ) => {
        const { View } = jest.requireActual('react-native');
        const React = jest.requireActual('react');
        React.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: () => onClose?.(),
        }));
        return <View>{children}</View>;
      },
    ),
    BottomSheetHeader: ({
      children,
      onClose,
    }: {
      children: React.ReactNode;
      onClose?: () => void;
    }) => (
      <View>
        {children}
        <TouchableOpacity
          testID="bottom-sheet-header-close"
          onPress={onClose}
        />
      </View>
    ),
    Button: ({
      children,
      onPress,
      testID,
    }: {
      children: React.ReactNode;
      onPress: () => void;
      testID?: string;
    }) => (
      <TouchableOpacity testID={testID} onPress={onPress}>
        <Text>{children}</Text>
      </TouchableOpacity>
    ),
    ButtonVariant: { Secondary: 'Secondary', Primary: 'Primary' },
    Text: ({ children }: { children: React.ReactNode }) => (
      <Text>{children}</Text>
    ),
    TextVariant: { HeadingMd: 'HeadingMd' },
  };
});

jest.mock('@metamask/controller-utils', () => ({
  toHex: jest.fn((val) => `0x${val.toString(16)}`),
}));

describe('NftGridItemBottomSheet', () => {
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

  const onClose = jest.fn();
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('renders nothing when not visible', () => {
    const { queryByTestId } = render(
      <NftGridItemBottomSheet
        isVisible={false}
        onClose={onClose}
        nft={mockNft}
      />,
    );

    expect(queryByTestId('nft-grid-item-bottom-sheet')).toBeNull();
  });

  it('renders bottom sheet with correct options when visible', () => {
    const { getByText, getByTestId } = render(
      <NftGridItemBottomSheet isVisible onClose={onClose} nft={mockNft} />,
    );

    expect(getByTestId('nft-grid-item-bottom-sheet')).toBeDefined();
    expect(getByText('wallet.collectible_action_title')).toBeDefined();
    expect(getByText('wallet.refresh_metadata')).toBeDefined();
    expect(getByText('wallet.remove')).toBeDefined();
    expect(getByText('wallet.cancel')).toBeDefined();
  });

  it('calls NftController.addNft when refresh metadata is pressed', () => {
    const { getByTestId } = render(
      <NftGridItemBottomSheet isVisible onClose={onClose} nft={mockNft} />,
    );

    fireEvent.press(getByTestId('nft-grid-item-bottom-sheet-refresh-button'));

    expect(Engine.context.NftController.addNft).toHaveBeenCalledWith(
      '0x123',
      '456',
      'mainnet',
    );
  });

  it('calls NftController.removeAndIgnoreNft and shows alert when remove is pressed', () => {
    const { getByTestId } = render(
      <NftGridItemBottomSheet isVisible onClose={onClose} nft={mockNft} />,
    );

    fireEvent.press(getByTestId('nft-grid-item-bottom-sheet-remove-button'));

    expect(
      Engine.context.NftController.removeAndIgnoreNft,
    ).toHaveBeenCalledWith('0x123', '456', 'mainnet');
    expect(alertSpy).toHaveBeenCalledWith(
      'wallet.collectible_removed_title',
      'wallet.collectible_removed_desc',
    );
  });

  it('calls onClose when cancel is pressed', () => {
    const { getByText } = render(
      <NftGridItemBottomSheet isVisible onClose={onClose} nft={mockNft} />,
    );

    fireEvent.press(getByText('wallet.cancel'));

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when header close button is pressed', () => {
    const { getByTestId } = render(
      <NftGridItemBottomSheet isVisible onClose={onClose} nft={mockNft} />,
    );

    fireEvent.press(getByTestId('bottom-sheet-header-close'));

    expect(onClose).toHaveBeenCalled();
  });

  it('does nothing when nft is null', () => {
    const { getByTestId } = render(
      <NftGridItemBottomSheet isVisible onClose={onClose} nft={null} />,
    );

    fireEvent.press(getByTestId('nft-grid-item-bottom-sheet-remove-button'));
    fireEvent.press(getByTestId('nft-grid-item-bottom-sheet-refresh-button'));

    expect(
      Engine.context.NftController.removeAndIgnoreNft,
    ).not.toHaveBeenCalled();
    expect(Engine.context.NftController.addNft).not.toHaveBeenCalled();
  });
});
