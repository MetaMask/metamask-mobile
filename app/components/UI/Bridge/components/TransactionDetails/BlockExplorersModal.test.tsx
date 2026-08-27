import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import React from 'react';
import Routes from '../../../../../constants/navigation/Routes';
import { BridgeState } from '../../../../../core/redux/slices/bridge';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { initialState } from '../../_mocks_/initialState';
import BlockExplorersModal from './BlockExplorersModal';

jest.mock('../../../../../util/analytics/externalLinkTracking', () => ({
  ...jest.requireActual('../../../../../util/analytics/externalLinkTracking'),
  trackBlockExplorerLinkClicked: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockOnCloseBottomSheet = jest.fn((callback?: () => void) => {
  callback?.();
});

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    ...actual,
    BottomSheet: forwardRef(
      (
        { children, testID }: { children: React.ReactNode; testID?: string },
        ref: React.Ref<unknown>,
      ) => {
        useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockOnCloseBottomSheet,
        }));
        return <View testID={testID ?? 'bottom-sheet'}>{children}</View>;
      },
    ),
  };
});

const mockTx = {
  id: 'test-tx-id',
  chainId: '0x1',
  hash: '0x123',
  networkClientId: 'mainnet',
  time: Date.now(),
  txParams: {
    from: '0x123',
    to: '0x456',
    value: '0x0',
    data: '0x',
  },
  status: TransactionStatus.submitted,
} as TransactionMeta;

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
      setOptions: jest.fn(),
    }),
    useRoute: () => ({
      key: '1',
      name: 'params',
      params: {
        evmTxMeta: mockTx,
      },
    }),
  };
});

describe('BlockExplorersModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnCloseBottomSheet.mockImplementation((callback?: () => void) => {
      callback?.();
    });
  });

  const mockState = {
    ...initialState,
    bridge: {
      sourceToken: {
        symbol: 'ETH',
        decimals: 18,
        address: '0x0000000000000000000000000000000000000000',
        image: 'https://example.com/image.png',
        chainId: '0x1' as Hex,
      },
      destToken: undefined,
      sourceAmount: undefined,
      destAmount: undefined,
      selectedDestChainId: undefined,
      selectedSourceChainIds: ['0x1' as Hex, '0xa' as Hex],
    } as BridgeState,
  };

  it('should render without crashing', () => {
    const { getByText } = renderScreen(
      () => <BlockExplorersModal />,
      {
        name: Routes.BRIDGE.MODALS.TRANSACTION_DETAILS_BLOCK_EXPLORER,
      },
      { state: mockState },
    );
    expect(getByText('View on block explorer')).toBeTruthy();
  });
});
