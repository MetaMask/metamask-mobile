import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector, useDispatch } from 'react-redux';
import { CaipChainId } from '@metamask/utils';
import NetworkListModal, {
  type NetworkListModalFilterTarget,
} from './NetworkListModal';
import {
  selectAllowedChainRanking,
  selectOrdersNetworkFilter,
  selectTokenSelectorNetworkFilter,
} from '../../../../../core/redux/slices/bridge';
import { useABTest } from '../../../../../hooks';
import { useChainValueOrder } from '../../hooks/useChainValueOrder';

const mockOnCloseBottomSheet = jest.fn();
let mockRouteParams: {
  enabledChainIds?: CaipChainId[];
  filterTarget?: NetworkListModalFilterTarget;
} = {};

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('../../../../../hooks', () => ({
  useABTest: jest.fn(),
}));

jest.mock('../../hooks/useChainValueOrder', () => ({
  useChainValueOrder: jest.fn(),
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
  selectAllowedChainRanking: jest.fn(),
  selectTokenSelectorNetworkFilter: jest.fn(),
  selectOrdersNetworkFilter: jest.fn(),
  setTokenSelectorNetworkFilter: jest.fn((chainId) => ({
    type: 'bridge/setTokenSelectorNetworkFilter',
    payload: chainId,
  })),
  setOrdersNetworkFilter: jest.fn((chainId) => ({
    type: 'bridge/setOrdersNetworkFilter',
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
    mockRouteParams = {};
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    jest.mocked(useABTest).mockReturnValue({
      variant: { orderByValue: false },
      variantName: 'control',
      isActive: true,
    });
    jest.mocked(useChainValueOrder).mockReturnValue(mockChainRanking);
    jest.mocked(selectAllowedChainRanking).mockReturnValue(mockChainRanking);
    jest.mocked(selectTokenSelectorNetworkFilter).mockReturnValue(undefined);
    jest.mocked(selectOrdersNetworkFilter).mockReturnValue(undefined);
    // NetworkListModal calls useSelector(selectTokenSelectorNetworkFilter)
    // directly, and wraps selectAllowedChainRanking in an inline lambda (to
    // forward the optional enabledChainIds route param) — invoke whatever
    // selector is passed so both routes resolve through the mocks above.
    mockUseSelector.mockImplementation(
      (selector: (state: unknown) => unknown) => selector({}),
    );
  });

  describe('rendering', () => {
    it('does not calculate holdings order for control', () => {
      render(<NetworkListModal />);

      expect(useChainValueOrder).not.toHaveBeenCalled();
    });

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

    it('renders every network in holdings order for treatment', () => {
      const treatmentRanking = [
        mockChainRanking[2],
        mockChainRanking[1],
        mockChainRanking[0],
      ];
      jest.mocked(useABTest).mockReturnValue({
        variant: { orderByValue: true },
        variantName: 'treatment',
        isActive: true,
      });
      jest.mocked(useChainValueOrder).mockReturnValue(treatmentRanking);

      const { getAllByTestId } = render(<NetworkListModal />);

      expect(
        getAllByTestId(/^network-option-/).map(({ props }) => props.testID),
      ).toEqual([
        'network-option-all',
        'network-option-eip155:10',
        'network-option-eip155:137',
        'network-option-eip155:1',
      ]);
    });
  });

  describe('enabledChainIds route param', () => {
    it('forwards enabledChainIds from route params to selectAllowedChainRanking', () => {
      const enabledChainIds: CaipChainId[] = ['eip155:1', 'eip155:56'];
      mockRouteParams = { enabledChainIds };

      render(<NetworkListModal />);

      expect(selectAllowedChainRanking).toHaveBeenCalledWith(
        expect.anything(),
        enabledChainIds,
      );
    });

    it('calls selectAllowedChainRanking with undefined when no route params are provided', () => {
      render(<NetworkListModal />);

      expect(selectAllowedChainRanking).toHaveBeenCalledWith(
        expect.anything(),
        undefined,
      );
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

  describe('orders filterTarget', () => {
    it('dispatches setOrdersNetworkFilter with undefined when "All" is pressed', () => {
      mockRouteParams = { filterTarget: 'orders' };

      const { getByTestId } = render(<NetworkListModal />);
      fireEvent.press(getByTestId('network-option-all'));

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'bridge/setOrdersNetworkFilter',
        payload: undefined,
      });
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'bridge/setTokenSelectorNetworkFilter',
        }),
      );
    });

    it('dispatches setOrdersNetworkFilter with chainId when a network is pressed', () => {
      mockRouteParams = { filterTarget: 'orders' };

      const { getByTestId } = render(<NetworkListModal />);
      fireEvent.press(getByTestId('network-option-eip155:137'));

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'bridge/setOrdersNetworkFilter',
        payload: 'eip155:137',
      });
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'bridge/setTokenSelectorNetworkFilter',
        }),
      );
    });
  });
});
