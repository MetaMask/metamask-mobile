import '../../_mocks_/initialState';
import React from 'react';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MarketClosedBottomSheet from './MarketClosedBottomSheet';
import { useNavigation } from '@react-navigation/native';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: jest.fn(),
  };
});

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
}));

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;

const initialMetrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const renderMarketClosedBottomSheet = () =>
  renderWithProvider(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <MarketClosedBottomSheet />
    </SafeAreaProvider>,
  );

describe('MarketClosedBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue({
      goBack: mockGoBack,
    } as unknown as ReturnType<typeof useNavigation>);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders correctly', () => {
    const { toJSON } = renderMarketClosedBottomSheet();

    expect(toJSON()).toMatchSnapshot();
  });

  it('navigates back when Done button is pressed', () => {
    const { getByTestId } = renderMarketClosedBottomSheet();

    const doneButton = getByTestId('bottomsheetfooter-button');
    fireEvent.press(doneButton);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('opens support URL when Learn more link is pressed', () => {
    const { getByText } = renderMarketClosedBottomSheet();

    const learnMoreLink = getByText(/Learn more/);
    fireEvent.press(learnMoreLink);

    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://status.ondo.finance/market',
    );
  });

  it('renders title in header', () => {
    const { getByTestId } = renderMarketClosedBottomSheet();

    const headerTitle = getByTestId('header-title');

    expect(headerTitle).toBeOnTheScreen();
  });

  it('renders description and learn more text', () => {
    const { getByText, getByTestId } = renderMarketClosedBottomSheet();

    expect(getByTestId('market-closed-description')).toBeOnTheScreen();
    expect(getByText(/Learn more/)).toBeOnTheScreen();
  });

  it('renders Done button in footer', () => {
    const { getByTestId } = renderMarketClosedBottomSheet();

    const footer = getByTestId('bottomsheetfooter');
    const doneButton = getByTestId('bottomsheetfooter-button');

    expect(footer).toBeOnTheScreen();
    expect(doneButton).toBeOnTheScreen();
  });
});
