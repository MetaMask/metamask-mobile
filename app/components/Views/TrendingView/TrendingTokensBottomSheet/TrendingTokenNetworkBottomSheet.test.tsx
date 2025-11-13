import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ImageSourcePropType } from 'react-native';
import { TrendingTokenNetworkBottomSheet } from './TrendingTokenNetworkBottomSheet';
import { CaipChainId } from '@metamask/utils';
import type { ProcessedNetwork } from '../../../hooks/useNetworksByNamespace/useNetworksByNamespace';

const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockOnCloseBottomSheet = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
}));

const mockUseParams = jest.fn();
jest.mock('../../../../util/navigation/navUtils', () => ({
  useParams: () => mockUseParams(),
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

const mockUseNetworksByNamespace = jest.fn(() => ({
  networks: mockNetworks,
}));

jest.mock(
  '../../../hooks/useNetworksByNamespace/useNetworksByNamespace',
  () => ({
    useNetworksByNamespace: () => mockUseNetworksByNamespace(),
    NetworkType: {
      Popular: 'popular',
    },
  }),
);

let storedOnClose: (() => void) | undefined;

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
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
          onCloseBottomSheet: (cb?: () => void) => void;
        }>,
      ) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        storedOnClose = onClose;
        useImperativeHandle(ref, () => ({
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
  '../../../../component-library/components/BottomSheets/BottomSheetHeader',
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

jest.mock('../../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: Text,
    TextVariant: {
      HeadingMD: 'HeadingMD',
      BodyMD: 'BodyMD',
    },
  };
});

jest.mock('../../../../component-library/components/Icons/Icon', () => {
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

jest.mock('../../../../component-library/components/Avatars/Avatar', () => {
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
  beforeEach(() => {
    jest.clearAllMocks();
    storedOnClose = undefined;
    mockUseParams.mockReturnValue({});
    mockUseNetworksByNamespace.mockReturnValue({
      networks: mockNetworks,
    });
  });

  it('renders with default "All networks" selected', () => {
    const { getByText, getByTestId } = render(
      <TrendingTokenNetworkBottomSheet />,
    );

    expect(getByText('Networks')).toBeTruthy();
    expect(getByText('All networks')).toBeTruthy();
    expect(getByTestId('icon-Check')).toBeTruthy();
  });

  it('renders all network options', () => {
    const { getByText } = render(<TrendingTokenNetworkBottomSheet />);

    expect(getByText('All networks')).toBeTruthy();
    expect(getByText('Ethereum Mainnet')).toBeTruthy();
    expect(getByText('Polygon')).toBeTruthy();
  });

  it('calls onNetworkSelect with null when "All networks" is pressed', () => {
    const mockOnNetworkSelect = jest.fn();
    mockUseParams.mockReturnValue({
      onNetworkSelect: mockOnNetworkSelect,
    });

    const { getByText } = render(<TrendingTokenNetworkBottomSheet />);

    const allNetworksOption = getByText('All networks');
    const parent = allNetworksOption.parent;
    if (!parent) throw new Error('Parent element not found');
    fireEvent.press(parent);

    expect(mockOnNetworkSelect).toHaveBeenCalledWith(null);
  });

  it('calls onNetworkSelect with chainIds when network is pressed', () => {
    const mockOnNetworkSelect = jest.fn();
    mockUseParams.mockReturnValue({
      onNetworkSelect: mockOnNetworkSelect,
    });

    const { getByText } = render(<TrendingTokenNetworkBottomSheet />);

    const ethereumOption = getByText('Ethereum Mainnet');
    const parent = ethereumOption.parent;
    if (!parent) throw new Error('Parent element not found');
    fireEvent.press(parent);

    expect(mockOnNetworkSelect).toHaveBeenCalledWith(['eip155:1']);
  });

  it('closes bottom sheet when network option is pressed', () => {
    const mockOnNetworkSelect = jest.fn();
    mockUseParams.mockReturnValue({
      onNetworkSelect: mockOnNetworkSelect,
    });

    const { getByText } = render(<TrendingTokenNetworkBottomSheet />);

    const allNetworksOption = getByText('All networks');
    const parent = allNetworksOption.parent;
    if (!parent) throw new Error('Parent element not found');
    fireEvent.press(parent);

    expect(mockOnCloseBottomSheet).toHaveBeenCalled();
  });

  it('navigates back when close button is pressed', () => {
    const { getByTestId } = render(<TrendingTokenNetworkBottomSheet />);

    const closeButton = getByTestId('close-button');
    fireEvent.press(closeButton);

    expect(mockGoBack).toHaveBeenCalled();
    expect(mockOnCloseBottomSheet).toHaveBeenCalled();
  });

  it('navigates back when sheet is closed via onClose', () => {
    render(<TrendingTokenNetworkBottomSheet />);

    if (storedOnClose) {
      storedOnClose();
    }

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('displays check icon for selected network', () => {
    mockUseParams.mockReturnValue({
      selectedNetwork: ['eip155:1'],
    });

    const { getByText, getByTestId } = render(
      <TrendingTokenNetworkBottomSheet />,
    );

    expect(getByText('Ethereum Mainnet')).toBeTruthy();
    expect(getByTestId('icon-Check')).toBeTruthy();
  });

  it('displays check icon for "All networks" when selected', () => {
    const { getByText, getByTestId } = render(
      <TrendingTokenNetworkBottomSheet />,
    );

    expect(getByText('All networks')).toBeTruthy();
    expect(getByTestId('icon-Check')).toBeTruthy();
  });

  it('renders network avatars with correct props', () => {
    const { getByTestId } = render(<TrendingTokenNetworkBottomSheet />);

    const ethereumAvatar = getByTestId('avatar-Ethereum Mainnet');
    expect(ethereumAvatar).toBeTruthy();
    expect(ethereumAvatar.props['data-image-source']).toEqual({
      uri: 'https://example.com/ethereum.png',
    });

    const polygonAvatar = getByTestId('avatar-Polygon');
    expect(polygonAvatar).toBeTruthy();
    expect(polygonAvatar.props['data-image-source']).toEqual({
      uri: 'https://example.com/polygon.png',
    });
  });

  it('renders global icon for "All networks" option', () => {
    const { getByTestId } = render(<TrendingTokenNetworkBottomSheet />);

    expect(getByTestId('icon-Global')).toBeTruthy();
  });
});
