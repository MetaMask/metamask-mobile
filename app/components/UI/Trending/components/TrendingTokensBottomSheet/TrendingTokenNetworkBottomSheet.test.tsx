import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { ImageSourcePropType } from 'react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { TrendingTokenNetworkBottomSheet } from './TrendingTokenNetworkBottomSheet';
import { CaipChainId } from '@metamask/utils';
import type { ProcessedNetwork } from '../../../../hooks/useNetworksByNamespace/useNetworksByNamespace';

const mockOnCloseBottomSheet = jest.fn();
const mockOnOpenBottomSheet = jest.fn();

const mockGetNetworkImageSource = jest.fn();
jest.mock('../../../../../util/networks', () => ({
  getNetworkImageSource: (params: { chainId: string }) =>
    mockGetNetworkImageSource(params),
}));

const mockNetworks: ProcessedNetwork[] = [
  {
    id: 'eip155:1',
    name: 'Ethereum Mainnet',
    caipChainId: 'eip155:1' as CaipChainId,
    imageSource: {
      uri: 'https://example.com/ethereum.png',
    } as ImageSourcePropType,
    isSelected: false,
  },
  {
    id: 'eip155:137',
    name: 'Polygon',
    caipChainId: 'eip155:137' as CaipChainId,
    imageSource: {
      uri: 'https://example.com/polygon.png',
    } as ImageSourcePropType,
    isSelected: false,
  },
];

const mockUsePopularNetworks = jest.fn(() => mockNetworks);

jest.mock('../../hooks/usePopularNetworks/usePopularNetworks', () => ({
  usePopularNetworks: () => mockUsePopularNetworks(),
}));

let storedOnClose: (() => void) | undefined;

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { View } = jest.requireActual('react-native');
    const { forwardRef, useImperativeHandle } = jest.requireActual('react');

    const MockBottomSheet = forwardRef(
      (
        {
          children,
          onClose,
        }: {
          children: React.ReactNode;
          onClose?: () => void;
        },
        ref: React.Ref<{
          onOpenBottomSheet: (cb?: () => void) => void;
          onCloseBottomSheet: (cb?: () => void) => void;
        }>,
      ) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        storedOnClose = onClose;
        useImperativeHandle(ref, () => ({
          onOpenBottomSheet: (cb?: () => void) => {
            mockOnOpenBottomSheet();
            cb?.();
          },
          onCloseBottomSheet: (cb?: () => void) => {
            mockOnCloseBottomSheet();
            cb?.();
          },
        }));

        return <View testID="bottom-sheet">{children}</View>;
      },
    );

    return {
      __esModule: true,
      default: MockBottomSheet,
    };
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { TouchableOpacity, View } = jest.requireActual('react-native');
    return ({
      children,
      onClose,
    }: {
      children: React.ReactNode;
      onClose?: () => void;
    }) => (
      <View testID="bottom-sheet-header">
        <TouchableOpacity testID="close-button" onPress={onClose}>
          Close
        </TouchableOpacity>
        {children}
      </View>
    );
  },
);

jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: Text,
    TextVariant: {
      HeadingMD: 'HeadingMD',
      BodyMD: 'BodyMD',
    },
    TextColor: {
      Default: 'Default',
      Alternative: 'Alternative',
    },
  };
});

jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const { View: RNView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockIcon({ name, size }: { name: string; size: string }) {
      return (
        <RNView testID={`icon-${name}`} data-size={size}>
          {name}
        </RNView>
      );
    },
    IconName: {
      Check: 'Check',
      Global: 'Global',
    },
    IconSize: {
      Md: 'Md',
    },
  };
});

jest.mock('../../../../../component-library/components/Avatars/Avatar', () => {
  const { View: RNView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockAvatar({
      name,
      imageSource,
    }: {
      name: string;
      imageSource?: string;
    }) {
      return (
        <RNView testID={`avatar-${name}`} data-image-source={imageSource}>
          {name}
        </RNView>
      );
    },
    AvatarSize: {
      Xs: 'Xs',
    },
    AvatarVariant: {
      Network: 'Network',
    },
  };
});

describe('TrendingTokenNetworkBottomSheet', () => {
  const mockOnClose = jest.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockState: any = {
    engine: {
      backgroundState: {
        NetworkController: {
          networkConfigurations: {},
          networkConfigurationsByChainId: {
            '0x1': {
              chainId: '0x1' as const,
              name: 'Ethereum Mainnet',
              caipChainId: 'eip155:1',
            },
            '0x89': {
              chainId: '0x89' as const,
              name: 'Polygon',
              caipChainId: 'eip155:137',
            },
          },
        },
        MultichainNetworkController: {
          selectedMultichainNetworkChainId: undefined,
          multichainNetworkConfigurationsByChainId: {},
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    storedOnClose = undefined;
    mockOnClose.mockClear();
    mockOnOpenBottomSheet.mockClear();
    mockUsePopularNetworks.mockReturnValue(mockNetworks);
    mockGetNetworkImageSource.mockImplementation(
      (params: { chainId: string }) => {
        if (params.chainId === 'eip155:1') {
          return { uri: 'https://example.com/ethereum.png' };
        }
        if (params.chainId === 'eip155:137') {
          return { uri: 'https://example.com/polygon.png' };
        }
        return { uri: 'https://example.com/default.png' };
      },
    );
  });

  it('renders with default "All networks" selected', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <TrendingTokenNetworkBottomSheet isVisible onClose={mockOnClose} />,
      { state: mockState },
      false,
    );

    expect(getByText('Networks')).toBeOnTheScreen();
    expect(getByText('All networks')).toBeOnTheScreen();
    expect(getByTestId('icon-Check')).toBeOnTheScreen();
  });

  it('renders all network options', () => {
    const { getByText } = renderWithProvider(
      <TrendingTokenNetworkBottomSheet isVisible onClose={mockOnClose} />,
      { state: mockState },
      false,
    );

    expect(getByText('All networks')).toBeOnTheScreen();
    expect(getByText('Ethereum Mainnet')).toBeOnTheScreen();
    expect(getByText('Polygon')).toBeOnTheScreen();
  });

  it('calls onNetworkSelect with null when "All networks" is pressed', () => {
    const mockOnNetworkSelect = jest.fn();

    const { getByText } = renderWithProvider(
      <TrendingTokenNetworkBottomSheet
        isVisible
        onClose={mockOnClose}
        onNetworkSelect={mockOnNetworkSelect}
      />,
      { state: mockState },
      false,
    );

    const allNetworksOption = getByText('All networks');
    const parent = allNetworksOption.parent;
    if (!parent) throw new Error('Parent element not found');
    fireEvent.press(parent);

    expect(mockOnNetworkSelect).toHaveBeenCalledWith(null);
  });

  it('calls onNetworkSelect with chainIds when network is pressed', () => {
    const mockOnNetworkSelect = jest.fn();

    const { getByText } = renderWithProvider(
      <TrendingTokenNetworkBottomSheet
        isVisible
        onClose={mockOnClose}
        onNetworkSelect={mockOnNetworkSelect}
      />,
      { state: mockState },
      false,
    );

    const ethereumOption = getByText('Ethereum Mainnet');
    const parent = ethereumOption.parent;
    if (!parent) throw new Error('Parent element not found');
    fireEvent.press(parent);

    expect(mockOnNetworkSelect).toHaveBeenCalledWith(['eip155:1']);
  });

  it('closes bottom sheet when network option is pressed', () => {
    const mockOnNetworkSelect = jest.fn();

    const { getByText } = renderWithProvider(
      <TrendingTokenNetworkBottomSheet
        isVisible
        onClose={mockOnClose}
        onNetworkSelect={mockOnNetworkSelect}
      />,
      { state: mockState },
      false,
    );

    const allNetworksOption = getByText('All networks');
    const parent = allNetworksOption.parent;
    if (!parent) throw new Error('Parent element not found');
    fireEvent.press(parent);

    expect(mockOnCloseBottomSheet).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when close button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <TrendingTokenNetworkBottomSheet isVisible onClose={mockOnClose} />,
      { state: mockState },
      false,
    );

    const closeButton = getByTestId('close-button');
    fireEvent.press(closeButton);

    expect(mockOnCloseBottomSheet).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when sheet is closed via onClose callback', () => {
    renderWithProvider(
      <TrendingTokenNetworkBottomSheet isVisible onClose={mockOnClose} />,
      { state: mockState },
      false,
    );

    if (storedOnClose) {
      storedOnClose();
    }

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays check icon for selected network', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <TrendingTokenNetworkBottomSheet
        isVisible
        onClose={mockOnClose}
        selectedNetwork={['eip155:1']}
      />,
      { state: mockState },
      false,
    );

    expect(getByText('Ethereum Mainnet')).toBeOnTheScreen();
    expect(getByTestId('icon-Check')).toBeOnTheScreen();
  });

  it('displays check icon for "All networks" when selected', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <TrendingTokenNetworkBottomSheet isVisible onClose={mockOnClose} />,
      { state: mockState },
      false,
    );

    expect(getByText('All networks')).toBeOnTheScreen();
    expect(getByTestId('icon-Check')).toBeOnTheScreen();
  });

  it('renders network avatars with correct props', () => {
    const { getByTestId } = renderWithProvider(
      <TrendingTokenNetworkBottomSheet isVisible onClose={mockOnClose} />,
      { state: mockState },
      false,
    );

    const ethereumAvatar = getByTestId('avatar-Ethereum Mainnet');
    expect(ethereumAvatar).toBeOnTheScreen();
    expect(ethereumAvatar.props['data-image-source']).toEqual({
      uri: 'https://example.com/ethereum.png',
    });

    const polygonAvatar = getByTestId('avatar-Polygon');
    expect(polygonAvatar).toBeOnTheScreen();
    expect(polygonAvatar.props['data-image-source']).toEqual({
      uri: 'https://example.com/polygon.png',
    });
  });

  it('renders global icon for "All networks" option', () => {
    const { getByTestId } = renderWithProvider(
      <TrendingTokenNetworkBottomSheet isVisible onClose={mockOnClose} />,
      { state: mockState },
      false,
    );

    expect(getByTestId('icon-Global')).toBeOnTheScreen();
  });

  it('does not render when isVisible is false', () => {
    const { queryByTestId } = renderWithProvider(
      <TrendingTokenNetworkBottomSheet
        isVisible={false}
        onClose={mockOnClose}
      />,
      { state: mockState },
      false,
    );

    expect(queryByTestId('bottom-sheet')).toBeNull();
  });

  it('calls onOpenBottomSheet when isVisible becomes true', () => {
    const { rerender } = renderWithProvider(
      <TrendingTokenNetworkBottomSheet
        isVisible={false}
        onClose={mockOnClose}
      />,
      { state: mockState },
      false,
    );

    expect(mockOnOpenBottomSheet).not.toHaveBeenCalled();

    rerender(
      <TrendingTokenNetworkBottomSheet isVisible onClose={mockOnClose} />,
    );

    expect(mockOnOpenBottomSheet).toHaveBeenCalled();
  });
});
