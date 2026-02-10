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

// BottomSheet requires a ref mock for onCloseBottomSheet imperative calls
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

// BottomSheetHeader uses Reanimated internally which doesn't work in tests
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

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  selectSourceChainRanking: jest.fn(),
  selectDestChainRanking: jest.fn(),
  selectTokenSelectorNetworkFilter: jest.fn(),
  setTokenSelectorNetworkFilter: jest.fn((chainId) => ({
    type: 'bridge/setTokenSelectorNetworkFilter',
    payload: chainId,
  })),
}));

const mockChainRanking = [
  { chainId: 'eip155:1' as CaipChainId, name: 'Ethereum' },
  { chainId: 'eip155:137' as CaipChainId, name: 'Polygon' },
  { chainId: 'eip155:10' as CaipChainId, name: 'Optimism' },
];

const mockUseSelector = useSelector as jest.Mock;
const mockDispatch = jest.fn();

// Cell uses ListItemSelect which relies on theme context.
// We render with a simple mock to avoid pulling in the full theme provider.
jest.mock('../../../../../component-library/components/Cells/Cell', () => {
  const { createElement } = jest.requireActual('react');
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    CellVariant: { Select: 'Select' },
    default: ({
      title,
      onPress,
      testID,
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
      ]),
  };
});

describe('NetworkListModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);

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
