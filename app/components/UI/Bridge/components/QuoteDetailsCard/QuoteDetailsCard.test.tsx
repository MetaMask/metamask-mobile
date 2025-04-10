import { fireEvent } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import QuoteDetailsCard from './QuoteDetailsCard';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import mockQuotes from '../../_mocks_/mock-quotes-native-erc20.json';
import { bridgeTestInitialState } from '../../_mocks_/bridgeInitialState';
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
    sourceToken: {
      address: '0x0000000000000000000000000000000000000000',
      chainId: '0x1',
      decimals: 18,
      symbol: 'ETH',
    },
    destToken: {
      address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
      chainId: '0xa',
      decimals: 6,
      symbol: 'USDC',
    },
    quoteFetchError: null,
    activeQuote: mockQuotes[0],
    sourceAmount: '1',
    destTokenAmount: '24.44',
    slippage: 0.5,
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
      { state: bridgeTestInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders expanded state', () => {
    const { getByLabelText, toJSON } = renderScreen(
      QuoteDetailsCard,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: bridgeTestInitialState },
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
      { state: bridgeTestInitialState },
    );

    expect(getByText('0.01')).toBeDefined();
  });

  it('displays processing time', () => {
    const { getByText } = renderScreen(
      QuoteDetailsCard,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: bridgeTestInitialState },
    );

    expect(getByText('1 min')).toBeDefined();
  });

  it('displays quote rate', () => {
    const { getByText } = renderScreen(
      QuoteDetailsCard,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: bridgeTestInitialState },
    );

    expect(getByText('1 ETH = 24.4 USDC')).toBeDefined();
  });

  it('toggles content visibility on chevron press', () => {
    const { getByLabelText, queryByText } = renderScreen(
      QuoteDetailsCard,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: bridgeTestInitialState },
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
      { state: bridgeTestInitialState },
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
      { state: bridgeTestInitialState },
    );

    expect(getByText('Ethereum Mainnet')).toBeDefined();
    expect(getByText('Optimism')).toBeDefined();
  });

  it('displays slippage value', () => {
    const { getByLabelText, getByText } = renderScreen(
      QuoteDetailsCard,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: bridgeTestInitialState },
    );

    // Expand the accordion first
    const expandButton = getByLabelText('Expand quote details');
    fireEvent.press(expandButton);

    // Verify slippage value
    expect(getByText('0.5%')).toBeDefined();
  });
});
