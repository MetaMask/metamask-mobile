import { fireEvent } from '@testing-library/react-native';
import {
  renderScreen,
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import QuoteDetailsCard from './QuoteDetailsCard';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { defaultBridgeControllerState } from '../../../../../core/Engine/controllers/bridge-controller/constants';
import mockQuotes from '../../_mocks_/mock-quotes-native-erc20.json';
import { QuoteResponse } from '@metamask/bridge-controller';
import { mockNetworkState } from '../../../../../util/test/network';
import { RpcEndpointType } from '@metamask/network-controller';
import { mockBridgeReducerState } from '../../_mocks_/bridgeReducerState';
import initialRootState from '../../../../../util/test/initial-root-state';
import { RootState } from '../../../../../reducers';
import { ChainId } from '@metamask/controller-utils';
import { createMockInternalAccount } from '../../../../../util/test/accountsControllerTestUtils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

describe('QuoteDetailsCard', () => {
  const mockAccount = createMockInternalAccount(
    '0x1234567890123456789012345678901234567890',
    'Test Account',
  );

  const initialState: DeepPartial<RootState> = {
    engine: {
      backgroundState: {
        ...initialRootState,
        BridgeController: {
          ...defaultBridgeControllerState,
          quotes: mockQuotes as unknown as QuoteResponse[],
        },
        NetworkController: {
          ...mockNetworkState(
            {
              chainId: ChainId.mainnet,
              id: 'mainnet',
              nickname: 'Ethereum',
              ticker: 'ETH',
              type: RpcEndpointType.Infura,
              rpcUrl: 'https://eth-mainnet.alchemyapi.io/v2/demo',
            },
            {
              chainId: ChainId['linea-mainnet'],
              id: 'linea',
              nickname: 'Linea',
              ticker: 'LINEA',
              type: RpcEndpointType.Custom,
              rpcUrl: 'https://linea-rpc.com',
            },
          ),
        },
        MultichainNetworkController: {
          multichainNetworkConfigurationsByChainId: {},
        },
        AccountsController: {
          internalAccounts: {
            accounts: {
              [mockAccount.id]: mockAccount,
            },
            selectedAccount: mockAccount.id,
          },
        },
      },
    },
    bridge: mockBridgeReducerState,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders initial state', () => {
    const { toJSON } = renderScreen(
      QuoteDetailsCard,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders expanded state', () => {
    const { getByLabelText, toJSON } = renderScreen(
      QuoteDetailsCard,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: initialState },
    );

    // Expand the accordion
    const expandButton = getByLabelText('Expand quote details');
    fireEvent.press(expandButton);

    expect(toJSON()).toMatchSnapshot();
  });

  it('displays fee amount', () => {
    const { getByText } = renderScreen(
      QuoteDetailsCard,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: initialState },
    );

    expect(getByText('$0.01')).toBeDefined();
  });

  it('displays processing time', () => {
    const { getByText } = renderScreen(
      QuoteDetailsCard,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: initialState },
    );

    expect(getByText('1 min')).toBeDefined();
  });

  it('displays quote rate', () => {
    const { getByText } = renderScreen(
      QuoteDetailsCard,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: initialState },
    );

    expect(getByText('1 ETH = 0.0 USDC')).toBeDefined();
  });

  it('toggles content visibility on chevron press', () => {
    const { getByLabelText, queryByText } = renderScreen(
      QuoteDetailsCard,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: initialState },
    );

    // Initially price impact should not be visible
    expect(queryByText(strings('bridge.price_impact'))).toBeNull();

    // Press chevron to expand
    const expandButton = getByLabelText('Expand quote details');
    fireEvent.press(expandButton);

    // After expansion, price impact should be visible
    expect(queryByText(strings('bridge.price_impact'))).toBeDefined();
    expect(queryByText('-0.06%')).toBeDefined();

    // Press chevron again to collapse
    fireEvent.press(expandButton);

    // After collapse, price impact should not be visible
    expect(queryByText(strings('bridge.price_impact'))).toBeNull();
  });

  it('navigates to slippage modal on edit press', () => {
    const { getByLabelText, getByTestId } = renderScreen(
      QuoteDetailsCard,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: initialState },
    );

    // Expand the accordion first
    const expandButton = getByLabelText('Expand quote details');
    fireEvent.press(expandButton);

    // Find and press the edit button
    const editButton = getByTestId('edit-slippage-button');
    fireEvent.press(editButton);

    // Check if navigation was called with correct params
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SLIPPAGE_MODAL,
    });
  });

  it('displays network names', () => {
    const { getByText } = renderScreen(
      QuoteDetailsCard,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: initialState },
    );

    expect(getByText('Ethereum')).toBeDefined();
    expect(getByText('Linea')).toBeDefined();
  });

  it('displays slippage value', () => {
    const { getByLabelText, getByText } = renderScreen(
      QuoteDetailsCard,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: initialState },
    );

    // Expand the accordion first
    const expandButton = getByLabelText('Expand quote details');
    fireEvent.press(expandButton);

    // Verify slippage value
    expect(getByText('0.5%')).toBeDefined();
  });
});
