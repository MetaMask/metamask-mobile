import React from 'react';
import { renderHook, render } from '@testing-library/react-native';
import { CardSDKProvider, useCardSDK, ICardSDK } from './index';
import { CardSDK } from './CardSDK';
import {
  CardFeatureFlag,
  SupportedToken,
} from '../../../../selectors/featureFlagController/card';

// Mock CardholderSDK
jest.mock('./CardSDK', () => ({
  CardSDK: jest.fn().mockImplementation(() => ({
    isCardEnabled: true,
    supportedTokens: [],
    isCardHolder: jest.fn(),
    getGeoLocation: jest.fn(),
    getSupportedTokensAllowances: jest.fn(),
    getPriorityToken: jest.fn(),
  })),
}));

// Mock selectors
jest.mock('../../../../selectors/networkController', () => ({
  selectChainId: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController/card', () => ({
  selectCardFeature: jest.fn(),
}));

// Mock react-redux hooks
const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: () => mockUseSelector(),
}));

describe('CardSDK Context', () => {
  const MockedCardholderSDK = jest.mocked(CardSDK);

  const mockSupportedTokens: SupportedToken[] = [
    {
      address: '0x1234567890123456789012345678901234567890',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
    },
  ];

  const mockCardFeatureFlag: CardFeatureFlag = {
    'eip155:59144': {
      enabled: true,
      tokens: mockSupportedTokens,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    MockedCardholderSDK.mockClear();
  });

  describe('CardSDKProvider', () => {
    it('should render children without crashing', () => {
      mockUseSelector
        .mockReturnValueOnce('0xe708') // selectedChainId
        .mockReturnValueOnce(mockCardFeatureFlag); // cardFeatureFlag

      const TestComponent = () => <div>Test Child</div>;

      render(
        <CardSDKProvider>
          <TestComponent />
        </CardSDKProvider>,
      );

      expect(MockedCardholderSDK).toHaveBeenCalledWith({
        cardFeatureFlag: mockCardFeatureFlag,
        rawChainId: '0xe708',
      });
    });

    it('should not initialize SDK when chain ID is missing', () => {
      mockUseSelector
        .mockReturnValueOnce(null) // selectedChainId
        .mockReturnValueOnce(mockCardFeatureFlag); // cardFeatureFlag

      const TestComponent = () => <div>Test Child</div>;

      render(
        <CardSDKProvider>
          <TestComponent />
        </CardSDKProvider>,
      );

      expect(MockedCardholderSDK).not.toHaveBeenCalled();
    });

    it('should not initialize SDK when card feature flag is missing', () => {
      mockUseSelector
        .mockReturnValueOnce('0xe708') // selectedChainId
        .mockReturnValueOnce(null); // cardFeatureFlag

      const TestComponent = () => <div>Test Child</div>;

      render(
        <CardSDKProvider>
          <TestComponent />
        </CardSDKProvider>,
      );

      expect(MockedCardholderSDK).not.toHaveBeenCalled();
    });

    it('should use provided value prop when given', () => {
      mockUseSelector
        .mockReturnValueOnce('0xe708') // selectedChainId
        .mockReturnValueOnce(mockCardFeatureFlag); // cardFeatureFlag

      const providedValue: ICardSDK = {
        sdk: null,
      };

      const TestComponent = () => {
        const context = useCardSDK();
        expect(context).toEqual(providedValue);
        return <div>Test Child</div>;
      };

      render(
        <CardSDKProvider value={providedValue}>
          <TestComponent />
        </CardSDKProvider>,
      );
    });
  });

  describe('useCardSDK', () => {
    it('should return SDK context when used within provider', () => {
      mockUseSelector
        .mockReturnValueOnce('0xe708') // selectedChainId
        .mockReturnValueOnce(mockCardFeatureFlag); // cardFeatureFlag

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CardSDKProvider>{children}</CardSDKProvider>
      );

      const { result } = renderHook(() => useCardSDK(), { wrapper });

      expect(result.current).toEqual({
        sdk: expect.any(Object),
      });
      expect(result.current.sdk).toHaveProperty('isCardEnabled', true);
      expect(result.current.sdk).toHaveProperty('supportedTokens', []);
      expect(result.current.sdk).toHaveProperty('isCardHolder');
      expect(result.current.sdk).toHaveProperty('getGeoLocation');
      expect(result.current.sdk).toHaveProperty('getSupportedTokensAllowances');
      expect(result.current.sdk).toHaveProperty('getPriorityToken');
    });

    it('should return null SDK when conditions are not met', () => {
      mockUseSelector
        .mockReturnValueOnce(null) // selectedChainId
        .mockReturnValueOnce(mockCardFeatureFlag); // cardFeatureFlag

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CardSDKProvider>{children}</CardSDKProvider>
      );

      const { result } = renderHook(() => useCardSDK(), { wrapper });

      expect(result.current).toEqual({
        sdk: null,
      });
    });

    it('should throw error when used outside of provider', () => {
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {
          // Suppress console error for test
        });

      expect(() => {
        renderHook(() => useCardSDK());
      }).toThrow('useCardSDK must be used within a CardSDKProvider');

      consoleError.mockRestore();
    });
  });

  describe('CardSDK interface', () => {
    it('should have correct interface structure', () => {
      mockUseSelector
        .mockReturnValueOnce('0xe708') // selectedChainId
        .mockReturnValueOnce(mockCardFeatureFlag); // cardFeatureFlag

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CardSDKProvider>{children}</CardSDKProvider>
      );

      const { result } = renderHook(() => useCardSDK(), { wrapper });

      expect(result.current).toHaveProperty('sdk');
      expect(
        typeof result.current.sdk === 'object' || result.current.sdk === null,
      ).toBe(true);

      // When SDK is initialized, check it has expected methods
      if (result.current.sdk) {
        expect(result.current.sdk).toHaveProperty('isCardEnabled');
        expect(result.current.sdk).toHaveProperty('supportedTokens');
        expect(result.current.sdk).toHaveProperty('isCardHolder');
        expect(result.current.sdk).toHaveProperty('getGeoLocation');
        expect(result.current.sdk).toHaveProperty(
          'getSupportedTokensAllowances',
        );
        expect(result.current.sdk).toHaveProperty('getPriorityToken');
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined chain ID gracefully', () => {
      mockUseSelector
        .mockReturnValueOnce(undefined) // selectedChainId
        .mockReturnValueOnce(mockCardFeatureFlag); // cardFeatureFlag

      const TestComponent = () => <div>Test Child</div>;

      render(
        <CardSDKProvider>
          <TestComponent />
        </CardSDKProvider>,
      );

      expect(MockedCardholderSDK).not.toHaveBeenCalled();
    });

    it('should handle undefined card feature flag gracefully', () => {
      mockUseSelector
        .mockReturnValueOnce('0xe708') // selectedChainId
        .mockReturnValueOnce(undefined); // cardFeatureFlag

      const TestComponent = () => <div>Test Child</div>;

      render(
        <CardSDKProvider>
          <TestComponent />
        </CardSDKProvider>,
      );

      expect(MockedCardholderSDK).not.toHaveBeenCalled();
    });

    it('should handle empty card feature flag gracefully', () => {
      mockUseSelector
        .mockReturnValueOnce('0xe708') // selectedChainId
        .mockReturnValueOnce({}); // empty cardFeatureFlag

      const TestComponent = () => <div>Test Child</div>;

      render(
        <CardSDKProvider>
          <TestComponent />
        </CardSDKProvider>,
      );

      expect(MockedCardholderSDK).toHaveBeenCalledWith({
        cardFeatureFlag: {},
        rawChainId: '0xe708',
      });
    });
  });
});
