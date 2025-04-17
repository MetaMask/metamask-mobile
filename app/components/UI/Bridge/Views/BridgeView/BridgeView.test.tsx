import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import {
  setDestToken,
  setSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { Hex } from '@metamask/utils';
import BridgeView from '.';
import { createBridgeTestState } from '../../testUtils';
import { initialState } from '../../_mocks_/initialState';

// TODO remove this mock once we have a real implementation
jest.mock('../../../../../selectors/confirmTransaction');

jest.mock('../../../../../core/Engine', () => ({
  context: {
    SwapsController: {
      fetchAggregatorMetadataWithCache: jest.fn(),
      fetchTopAssetsWithCache: jest.fn(),
      fetchTokenWithCache: jest.fn(),
    },
  },
}));

jest.mock('../../../../../core/redux/slices/bridge', () => {
  const actualBridgeSlice = jest.requireActual(
    '../../../../../core/redux/slices/bridge',
  );
  return {
    __esModule: true,
    ...actualBridgeSlice,
    default: actualBridgeSlice.default,
    setSourceToken: jest.fn(actualBridgeSlice.setSourceToken),
    setDestToken: jest.fn(actualBridgeSlice.setDestToken),
  };
});

// const mockSubmitBridgeTx = jest.fn();
// jest.mock('../../../util/bridge/hooks/useSubmitBridgeTx', () => ({
//   __esModule: true,
//   default: () => ({
//     submitBridgeTx: mockSubmitBridgeTx,
//   }),
// }));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: jest.fn(),
    }),
  };
});

// Mock useLatestBalance hook
jest.mock('../../hooks/useLatestBalance', () => ({
  useLatestBalance: jest.fn().mockImplementation(({ address, chainId }) => {
    if (!address || !chainId) return undefined;

    // Need to do this due to this error: "The module factory of `jest.mock()` is not allowed to reference any out-of-scope variables.""
    const actualEthers = jest.requireActual('ethers');

    return {
      displayBalance: '2.0',
      atomicBalance: actualEthers.BigNumber.from('2000000000000000000'), // 2 ETH
    };
  }),
}));

describe('BridgeView', () => {
  const mockChainId = '0x1' as Hex;
  const optimismChainId = '0xa' as Hex;
  const token2Address = '0x0000000000000000000000000000000000000002' as Hex;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', async () => {
    const { getByText } = renderScreen(
      BridgeView,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: initialState },
    );
    expect(getByText('Select amount')).toBeDefined();
  });

  it('should open BridgeTokenSelector when clicking source token', async () => {
    const { findByText } = renderScreen(
      BridgeView,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: initialState },
    );

    // Find and click the token button
    const tokenButton = await findByText('ETH');
    expect(tokenButton).toBeTruthy();
    fireEvent.press(tokenButton);

    // Verify navigation to BridgeTokenSelector
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SOURCE_TOKEN_SELECTOR,
      params: {},
    });
  });

  it('should open BridgeDestNetworkSelector when clicking destination token area', async () => {
    const { getByText } = renderScreen(
      BridgeView,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: initialState },
    );

    // Find and click the destination token area
    const destTokenArea = getByText('Bridge to');
    expect(destTokenArea).toBeTruthy();

    fireEvent.press(destTokenArea);

    // Verify navigation to BridgeTokenSelector
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.DEST_NETWORK_SELECTOR,
      params: {
        shouldGoToTokens: true,
      },
    });
  });

  it('should update source token amount when typing', async () => {
    const { getByTestId, getByText } = renderScreen(
      BridgeView,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: initialState },
    );

    // Press number buttons to input
    fireEvent.press(getByText('9'));
    fireEvent.press(getByText('.'));
    fireEvent.press(getByText('5'));

    // Verify the input value is updated
    const input = getByTestId('source-token-area-input');
    await waitFor(() => {
      expect(input.props.value).toBe('9.5');
    });

    // Verify fiat value is displayed (9.5 ETH * $2000 = $19000)
    expect(getByText('$19000')).toBeTruthy();
  });

  it('should display source token symbol and balance', async () => {
    const stateWithAmount = {
      ...initialState,
      bridge: {
        ...initialState.bridge,
        sourceAmount: '1.5',
      },
    };

    const { getByText, getByTestId } = renderScreen(
      BridgeView,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: stateWithAmount },
    );

    // Verify token symbol is displayed
    expect(getByText('ETH')).toBeTruthy();

    // Verify token amount is displayed
    const input = getByTestId('source-token-area-input');
    expect(input.props.value).toBe('1.5');

    // Verify fiat value is displayed (1.5 ETH * $2000 = $3000)
    expect(getByText('$3000')).toBeTruthy();

    // Verify balance is displayed
    await waitFor(() => {
      expect(getByText('2.0 ETH')).toBeTruthy();
    });
  });

  it('should switch tokens when clicking arrow button', () => {
    const initialStateWithTokens = {
      ...initialState,
      bridge: {
        ...initialState.bridge,
        sourceToken: {
          address: '0x0000000000000000000000000000000000000000',
          chainId: '0x1' as Hex,
          decimals: 18,
          image: '',
          name: 'Ether',
          symbol: 'ETH',
        },
        destToken: {
          address: token2Address,
          chainId: '0x1' as Hex,
          decimals: 6,
          image:
            'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
          symbol: 'USDC',
        },
      },
    };

    const { getByTestId } = renderScreen(
      BridgeView,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: initialStateWithTokens },
    );

    const arrowButton = getByTestId('arrow-button');
    fireEvent.press(arrowButton);

    expect(setSourceToken).toHaveBeenCalledWith(
      initialStateWithTokens.bridge.destToken,
    );
    expect(setDestToken).toHaveBeenCalledWith(
      initialStateWithTokens.bridge.sourceToken,
    );
  });

  describe('Bottom Content', () => {
    it('should show "Select amount" when no amount is entered', () => {
      const { getByText } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: initialState },
      );

      expect(getByText('Select amount')).toBeTruthy();
    });

    it('should show "Select amount" when amount is zero', () => {
      const stateWithZeroAmount = {
        ...initialState,
        bridge: {
          ...initialState.bridge,
          sourceAmount: '0',
        },
      };

      const { getByText } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: stateWithZeroAmount },
      );

      expect(getByText('Select amount')).toBeTruthy();
    });

    it('should show "Insufficient balance" when amount exceeds balance', () => {
      const testState = createBridgeTestState({
        bridgeControllerOverrides: {
          quoteRequest: {
            insufficientBal: true,
          },
        },
      });

      const { getByText } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: testState },
      );

      expect(getByText('Insufficient funds')).toBeTruthy();
    });

    it('should show Continue button and Terms link when amount is valid', () => {
      const testState = createBridgeTestState({
        bridgeControllerOverrides: {
          quoteRequest: {
            insufficientBal: false,
          },
        },
        bridgeReducerOverrides: {
          sourceAmount: '1.0', // Less than balance of 2.0 ETH
        },
      });

      const { getByText } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: testState },
      );

      expect(getByText('Continue')).toBeTruthy();
      expect(getByText('Terms & Conditions')).toBeTruthy();
    });

    it('should handle Continue button press', async () => {
      const { getByText } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        {
          state: {
            ...initialState,
            bridge: {
              ...initialState.bridge,
              sourceAmount: '1.0',
              destToken: {
                address: token2Address,
                symbol: 'TOKEN2',
                decimals: 18,
                image: 'https://token2.com/logo.png',
                chainId: optimismChainId,
              },
              selectedDestChainId: optimismChainId,
              selectedSourceChainIds: [mockChainId, optimismChainId],
            },
          },
        },
      );

      const continueButton = getByText('Continue');
      fireEvent.press(continueButton);

      // TODO: Add expectations once quote response is implemented
      // expect(mockSubmitBridgeTx).toHaveBeenCalled();
    });

    it('should handle Terms & Conditions press', () => {
      const testState = createBridgeTestState({
        bridgeControllerOverrides: {
          quoteRequest: {
            insufficientBal: false,
          },
        },
        bridgeReducerOverrides: {
          sourceAmount: '1.0', // Less than balance of 2.0 ETH
        },
      });

      const { getByText } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: testState },
      );

      const termsButton = getByText('Terms & Conditions');
      fireEvent.press(termsButton);

      // TODO: Add expectations once Terms navigation is implemented
    });
  });
});