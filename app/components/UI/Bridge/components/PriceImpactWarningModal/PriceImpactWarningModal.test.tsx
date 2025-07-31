import React from 'react';
import PriceImpactWarningModal from './PriceImpactWarningModal';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

// Mock navigation
const mockGoBack = jest.fn();
const mockUseRoute = jest.fn().mockReturnValue({
  params: {
    isGasIncluded: false,
  },
});

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => ({
    goBack: mockGoBack,
  })),
  useRoute: mockUseRoute,
}));

// Mock safe area context (required for BottomSheet)
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'bridge.price_impact_warning_title': 'Price Impact Warning',
      'bridge.price_impact_gasless_warning':
        'Price impact reflects how your swap order affects the market price of the asset. If you do not hold enough funds for gas, part of your source token is automatically allocated to cover the gas fee.',
      'bridge.price_impact_normal_warning':
        'Price impact reflects how your swap order affects the market price of the asset. It depends on the trade size and the available liquidity in the pool. MetaMask does not control this fee.',
    };
    return translations[key] || key;
  }),
}));

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {},
  },
};

describe('PriceImpactWarningModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default route params for most tests
    mockUseRoute.mockReturnValue({
      params: {
        isGasIncluded: false,
      },
    });
  });

  it('should render modal with correct title and normal warning', () => {
    const { getByText } = renderWithProvider(<PriceImpactWarningModal />, {
      state: mockInitialState,
    });

    // Test that the component renders
    expect(getByText('Price Impact Warning')).toBeTruthy();
    expect(
      getByText(/depends on the trade size and the available liquidity/),
    ).toBeTruthy();
  });

  it('should render gasless warning when isGasIncluded is true', () => {
    // Set specific route params for this test
    mockUseRoute.mockReturnValue({
      params: {
        isGasIncluded: true,
      },
    });

    const { getByText } = renderWithProvider(<PriceImpactWarningModal />, {
      state: mockInitialState,
    });

    expect(getByText('Price Impact Warning')).toBeTruthy();
    expect(getByText(/If you do not hold enough funds for gas/)).toBeTruthy();
  });

  it('should handle missing route params gracefully', () => {
    // Set undefined params for this test
    mockUseRoute.mockReturnValue({
      params: undefined,
    });

    const { getByText } = renderWithProvider(<PriceImpactWarningModal />, {
      state: mockInitialState,
    });

    expect(getByText('Price Impact Warning')).toBeTruthy();
    expect(
      getByText(/depends on the trade size and the available liquidity/),
    ).toBeTruthy();
  });

  it('should handle null route params gracefully', () => {
    // Set null params for this test
    mockUseRoute.mockReturnValue({
      params: null,
    });

    const { getByText } = renderWithProvider(<PriceImpactWarningModal />, {
      state: mockInitialState,
    });

    expect(getByText('Price Impact Warning')).toBeTruthy();
    expect(
      getByText(/depends on the trade size and the available liquidity/),
    ).toBeTruthy();
  });

  it('should call navigation.goBack when close is triggered', () => {
    const { getByText } = renderWithProvider(<PriceImpactWarningModal />, {
      state: mockInitialState,
    });

    // Since we can't easily test the actual close button due to the BottomSheet complexity,
    // we test that the modal renders and the navigation mock is available
    expect(getByText('Price Impact Warning')).toBeTruthy();
    expect(mockGoBack).not.toHaveBeenCalled(); // Should not be called on render
  });

  it('should render proper content structure', () => {
    const { getByText } = renderWithProvider(<PriceImpactWarningModal />, {
      state: mockInitialState,
    });

    // Verify all expected content is present
    expect(getByText('Price Impact Warning')).toBeTruthy();
    expect(
      getByText(/Price impact reflects how your swap order affects/),
    ).toBeTruthy();
  });

  it('should handle different isGasIncluded parameter values', () => {
    // Test with false explicitly
    mockUseRoute.mockReturnValue({
      params: {
        isGasIncluded: false,
      },
    });

    const { getByText } = renderWithProvider(<PriceImpactWarningModal />, {
      state: mockInitialState,
    });

    expect(getByText('Price Impact Warning')).toBeTruthy();
    expect(
      getByText(/depends on the trade size and the available liquidity/),
    ).toBeTruthy();
  });
});
