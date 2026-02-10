import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector, useDispatch } from 'react-redux';
import { CaipChainId } from '@metamask/utils';
import NetworkListModal from './NetworkListModal';
import {
  selectSourceChainRanking,
  selectDestChainRanking,
  selectTokenSelectorNetworkFilter,
} from '../../../../../core/redux/slices/bridge';

// --- Mocks ---

const mockOnCloseBottomSheet = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({
    params: { type: 'source' },
  }),
}));

jest.mock('../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => ({ uri: 'mock-network-icon' })),
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { forwardRef, useImperativeHandle } = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: forwardRef(
        (
          { children }: { children: React.ReactNode },
          ref: React.Ref<unknown>,
        ) => {
          useImperativeHandle(ref, () => ({
            onCloseBottomSheet: mockOnCloseBottomSheet,
          }));
          return <View testID="bottom-sheet">{children}</View>;
        },
      ),
    };
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { createElement } = jest.requireActual('react');
    const { Text } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        children,
      }: {
        children: React.ReactNode;
        onClose?: () => void;
      }) => createElement(Text, null, children),
    };
  },
);

jest.mock('../../../../../component-library/components/Cells/Cell', () => {
  const { createElement } = jest.requireActual('react');
  const { TouchableOpacity, Text, View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    CellVariant: { Select: 'Select' },
    default: ({
      title,
      onPress,
      testID,
      children,
    }: {
      title: string;
      onPress?: () => void;
      testID?: string;
      isSelected?: boolean;
      variant?: string;
      avatarProps?: unknown;
      children?: React.ReactNode;
    }) =>
      createElement(TouchableOpacity, { onPress, testID }, [
        createElement(Text, { key: 'title' }, title),
        children
          ? createElement(
              View,
              { key: 'children', testID: `${testID}-children` },
              children,
            )
          : null,
      ]),
  };
});

jest.mock('../../../../../component-library/components/Avatars/Avatar', () => ({
  AvatarVariant: { Icon: 'Icon', Network: 'Network' },
}));

jest.mock(
  '../../../../../component-library/components/Avatars/Avatar/Avatar.types',
  () => ({
    AvatarSize: { Sm: 'Sm' },
  }),
);

jest.mock('@metamask/design-system-react-native', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    Icon: ({
      name,
      testID,
    }: {
      name: string;
      testID?: string;
      size?: string;
    }) => createElement(View, { testID: testID ?? `icon-${name}` }),
    IconName: { Global: 'Global', Check: 'Check' },
    IconSize: { Md: 'Md' },
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    if (key === 'bridge.select_network') return 'Select network';
    if (key === 'bridge.all_networks') return 'All networks';
    return key;
  },
}));

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  selectSourceChainRanking: jest.fn(),
  selectDestChainRanking: jest.fn(),
  selectTokenSelectorNetworkFilter: jest.fn(),
  setTokenSelectorNetworkFilter: jest.fn((chainId) => ({
    type: 'bridge/setTokenSelectorNetworkFilter',
    payload: chainId,
  })),
}));

// --- Test data ---

const mockChainRanking = [
  { chainId: 'eip155:1' as CaipChainId, name: 'Ethereum' },
  { chainId: 'eip155:137' as CaipChainId, name: 'Polygon' },
  { chainId: 'eip155:10' as CaipChainId, name: 'Optimism' },
];

const mockUseSelector = useSelector as jest.Mock;
const mockDispatch = jest.fn();

describe('NetworkListModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);

    // Default: no network selected ("All"), source chain ranking
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (
        selector === selectSourceChainRanking ||
        selector === selectDestChainRanking
      ) {
        return mockChainRanking;
      }
      if (selector === selectTokenSelectorNetworkFilter) {
        return undefined;
      }
      return undefined;
    });
  });

  describe('rendering', () => {
    it('renders the header with "Select network"', () => {
      const { getByText } = render(<NetworkListModal />);
      expect(getByText('Select network')).toBeTruthy();
    });

    it('renders "All networks" option', () => {
      const { getByText, getByTestId } = render(<NetworkListModal />);
      expect(getByText('All networks')).toBeTruthy();
      expect(getByTestId('network-option-all')).toBeTruthy();
    });

    it('renders all networks from chain ranking', () => {
      const { getByText } = render(<NetworkListModal />);
      expect(getByText('Ethereum')).toBeTruthy();
      expect(getByText('Polygon')).toBeTruthy();
      expect(getByText('Optimism')).toBeTruthy();
    });

    it('renders check icon for "All" when no chain is selected', () => {
      const { getByTestId } = render(<NetworkListModal />);
      // The "All" cell should have children (the check icon)
      expect(getByTestId('network-option-all-children')).toBeTruthy();
    });

    it('renders check icon for selected network', () => {
      mockUseSelector.mockImplementation((selector: unknown) => {
        if (selector === selectTokenSelectorNetworkFilter) {
          return 'eip155:137' as CaipChainId;
        }
        return mockChainRanking;
      });

      const { getByTestId, queryByTestId } = render(<NetworkListModal />);
      // Selected network should have children (check icon)
      expect(getByTestId('network-option-eip155:137-children')).toBeTruthy();
      // "All" should not have children rendered
      expect(queryByTestId('network-option-all-children')).toBeNull();
    });
  });

  describe('interactions', () => {
    it('dispatches setTokenSelectorNetworkFilter with undefined when "All" is pressed', () => {
      const { getByTestId } = render(<NetworkListModal />);
      fireEvent.press(getByTestId('network-option-all'));

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'bridge/setTokenSelectorNetworkFilter',
        payload: undefined,
      });
    });

    it('dispatches setTokenSelectorNetworkFilter with chainId when a network is pressed', () => {
      const { getByTestId } = render(<NetworkListModal />);
      fireEvent.press(getByTestId('network-option-eip155:137'));

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'bridge/setTokenSelectorNetworkFilter',
        payload: 'eip155:137',
      });
    });

    it('closes the bottom sheet after selecting a network', () => {
      const { getByTestId } = render(<NetworkListModal />);
      fireEvent.press(getByTestId('network-option-eip155:1'));

      expect(mockOnCloseBottomSheet).toHaveBeenCalled();
    });

    it('closes the bottom sheet after selecting "All"', () => {
      const { getByTestId } = render(<NetworkListModal />);
      fireEvent.press(getByTestId('network-option-all'));

      expect(mockOnCloseBottomSheet).toHaveBeenCalled();
    });
  });
});
