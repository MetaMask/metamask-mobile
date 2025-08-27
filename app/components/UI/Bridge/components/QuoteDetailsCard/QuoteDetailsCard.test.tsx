import '../../_mocks_/initialState';
import { fireEvent } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import QuoteDetailsCard from './QuoteDetailsCard';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import mockQuotes from '../../_mocks_/mock-quotes-sol-sol.json';
import mockQuotesGasIncluded from '../../_mocks_/mock-quotes-gas-included.json';
import { createBridgeTestState } from '../../testUtils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

//Mock useBridgeQuoteData hook
jest.mock('../../hooks/useBridgeQuoteData', () => ({
  useBridgeQuoteData: jest.fn().mockImplementation(() => ({
    quoteFetchError: null,
    activeQuote: {
      ...mockQuotes[0],
      quote: {
        ...mockQuotes[0].quote,
        feeData: {
          metabridge: {
            amount: '1000000', // Non-zero fee to show disclaimer
            asset: mockQuotes[0].quote.feeData.metabridge.asset,
          },
        },
      },
    },
    destTokenAmount: '24.44',
    isLoading: false,
    formattedQuoteData: {
      networkFee: '0.01',
      estimatedTime: '1 min',
      rate: '1 ETH = 24.4 USDC',
      priceImpact: '-0.06%',
      slippage: '0.5%',
    },
  })),
}));

// Mock the bridge selectors
jest.mock('../../../../../core/redux/slices/bridge', () => ({
  ...jest.requireActual('../../../../../core/redux/slices/bridge'),
  selectBridgeFeatureFlags: () => ({
    priceImpactThreshold: {
      normal: 3.0,
      gasless: 1.5,
    },
  }),
  selectIsEvmSolanaBridge: () => true,
  selectSourceToken: () => ({
    chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    address: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    symbol: 'SOL',
    decimals: 9,
    name: 'Solana',
  }),
  selectDestToken: () => ({
    chainId: 'evm:1',
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    decimals: 18,
    name: 'Ethereum',
  }),
  selectSourceAmount: () => '1.0',
}));

// want to make the source token solana and dest token evm
const testState = createBridgeTestState({
  bridgeReducerOverrides: {
    sourceToken: {
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      address: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      symbol: 'SOL',
      decimals: 9,
      name: 'Solana',
    },
    destToken: {
      chainId: 'evm:1',
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      decimals: 18,
      name: 'Ethereum',
    },
  },
});

describe('QuoteDetailsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders initial state', () => {
    const { toJSON } = renderScreen(
      QuoteDetailsCard,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: testState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders expanded state', () => {
    const { getByLabelText, toJSON } = renderScreen(
      QuoteDetailsCard,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: testState },
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
      { state: testState },
    );

    expect(getByText('0.01')).toBeDefined();
  });

  it('displays processing time', () => {
    const { getByText } = renderScreen(
      QuoteDetailsCard,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: testState },
    );

    expect(getByText('1 min')).toBeDefined();
  });

  it('displays quote rate', () => {
    const { getByText } = renderScreen(
      QuoteDetailsCard,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: testState },
    );

    expect(getByText('1 ETH = 24.4 USDC')).toBeDefined();
  });

  it('toggles content visibility on chevron press', () => {
    const { getByLabelText, queryByText } = renderScreen(
      QuoteDetailsCard,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: testState },
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
      { state: testState },
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
    const initialTestState = createBridgeTestState();

    const { getByText } = renderScreen(
      QuoteDetailsCard,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: initialTestState },
    );

    expect(getByText('Solana')).toBeDefined();
  });

  it('displays slippage value', () => {
    const { getByLabelText, getByText } = renderScreen(
      QuoteDetailsCard,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: testState },
    );

    // Expand the accordion first
    const expandButton = getByLabelText('Expand quote details');
    fireEvent.press(expandButton);

    // Verify slippage value
    expect(getByText('0.5%')).toBeDefined();
  });

  it('displays "Included" fee when gasIncluded is true', () => {
    // Temporarily replace the mock with one that has gasIncluded = true
    const mockModule = jest.requireMock('../../hooks/useBridgeQuoteData');
    const originalImpl = mockModule.useBridgeQuoteData.getMockImplementation();

    mockModule.useBridgeQuoteData.mockImplementationOnce(() => ({
      quoteFetchError: null,
      activeQuote: mockQuotesGasIncluded[0],
      destTokenAmount: '24.44',
      isLoading: false,
      formattedQuoteData: {
        networkFee: '0.01',
        estimatedTime: '1 min',
        rate: '1 ETH = 24.4 USDC',
        priceImpact: '-0.06%',
        slippage: '0.5%',
      },
    }));

    const { getByText } = renderScreen(
      QuoteDetailsCard,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: testState },
    );

    // Verify "Included" text is displayed
    expect(getByText('Included')).toBeDefined();

    // Restore original implementation
    mockModule.useBridgeQuoteData.mockImplementation(originalImpl);
  });

  it('does not show fee disclaimer when there is no fee', () => {
    // Given a quote with zero fee
    const mockModule = jest.requireMock('../../hooks/useBridgeQuoteData');
    mockModule.useBridgeQuoteData.mockImplementationOnce(() => ({
      quoteFetchError: null,
      activeQuote: {
        ...mockQuotes[0],
        quote: {
          ...mockQuotes[0].quote,
          feeData: {
            metabridge: {
              amount: '0', // Zero fee
            },
          },
        },
      },
      destTokenAmount: '24.44',
      isLoading: false,
      formattedQuoteData: {
        networkFee: '0.01',
        estimatedTime: '1 min',
        rate: '1 ETH = 24.4 USDC',
        priceImpact: '-0.06%',
        slippage: '0.5%',
      },
    }));

    // When rendering the QuoteDetailsCard
    const { queryByText } = renderScreen(
      QuoteDetailsCard,
      { name: Routes.BRIDGE.ROOT },
      { state: testState },
    );

    // Then the fee disclaimer should not be displayed
    expect(queryByText(strings('bridge.fee_disclaimer'))).toBeNull();
  });

  it('shows fee disclaimer when there is a fee', () => {
    // Given a quote with a non-zero fee
    const mockModule = jest.requireMock('../../hooks/useBridgeQuoteData');
    mockModule.useBridgeQuoteData.mockImplementationOnce(() => ({
      quoteFetchError: null,
      activeQuote: {
        ...mockQuotes[0],
        quote: {
          ...mockQuotes[0].quote,
          feeData: {
            metabridge: {
              amount: '1000000', // Non-zero fee
            },
          },
        },
      },
      destTokenAmount: '24.44',
      isLoading: false,
      formattedQuoteData: {
        networkFee: '0.01',
        estimatedTime: '1 min',
        rate: '1 ETH = 24.4 USDC',
        priceImpact: '-0.06%',
        slippage: '0.5%',
      },
    }));

    // When rendering the QuoteDetailsCard
    const { getByText } = renderScreen(
      QuoteDetailsCard,
      { name: Routes.BRIDGE.ROOT },
      { state: testState },
    );

    // Then the fee disclaimer should be displayed
    expect(getByText(strings('bridge.fee_disclaimer'))).toBeOnTheScreen();
  });
});
