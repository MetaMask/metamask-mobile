import React from 'react';
import { renderHook, render, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { CardSDKProvider, useCardSDK, ICardSDK } from './index';
import { CardSDK } from './CardSDK';
import {
  CardFeatureFlag,
  SupportedToken,
  selectCardFeatureFlag,
} from '../../../../selectors/featureFlagController/card';
import { selectChainId } from '../../../../selectors/networkController';

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

jest.mock('../../../../selectors/networkController', () => ({
  selectChainId: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController/card', () => ({
  selectCardFeatureFlag: jest.fn(),
}));

// Mock react-redux hooks
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

describe('CardSDK Context', () => {
  const MockedCardholderSDK = jest.mocked(CardSDK);
  const mockUseSelector = jest.mocked(useSelector);
  const mockSelectChainId = jest.mocked(selectChainId);
  const mockSelectCardFeatureFlag = jest.mocked(selectCardFeatureFlag);

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
    mockSelectChainId.mockClear();
    mockSelectCardFeatureFlag.mockClear();
    mockUseSelector.mockClear();
  });

  const setupMockUseSelector = (
    chainId: string | null | undefined,
    featureFlag: CardFeatureFlag | null | undefined,
  ) => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === mockSelectChainId) {
        return chainId;
      }
      if (selector === mockSelectCardFeatureFlag) {
        return featureFlag;
      }
      return null;
    });
  };

  describe('CardSDKProvider', () => {
    it('should render children without crashing', () => {
      setupMockUseSelector('0xe708', mockCardFeatureFlag);

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
      setupMockUseSelector(null, mockCardFeatureFlag);

      const TestComponent = () => <div>Test Child</div>;

      render(
        <CardSDKProvider>
          <TestComponent />
        </CardSDKProvider>,
      );

      expect(MockedCardholderSDK).not.toHaveBeenCalled();
    });

    it('should not initialize SDK when card feature flag is missing', () => {
      setupMockUseSelector('0xe708', null);

      const TestComponent = () => <div>Test Child</div>;

      render(
        <CardSDKProvider>
          <TestComponent />
        </CardSDKProvider>,
      );

      expect(MockedCardholderSDK).not.toHaveBeenCalled();
    });

    it('should use provided value prop when given', () => {
      setupMockUseSelector('0xe708', mockCardFeatureFlag);

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
    it('should return SDK context when used within provider', async () => {
      setupMockUseSelector('0xe708', mockCardFeatureFlag);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CardSDKProvider>{children}</CardSDKProvider>
      );

      const { result } = renderHook(() => useCardSDK(), { wrapper });

      await waitFor(() => {
        expect(result.current.sdk).not.toBeNull();
      });

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
      setupMockUseSelector(null, mockCardFeatureFlag);

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
    it('should have correct interface structure', async () => {
      setupMockUseSelector('0xe708', mockCardFeatureFlag);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CardSDKProvider>{children}</CardSDKProvider>
      );

      const { result } = renderHook(() => useCardSDK(), { wrapper });

      await waitFor(() => {
        expect(result.current.sdk).not.toBeNull();
      });

      expect(result.current).toHaveProperty('sdk');
      expect(
        typeof result.current.sdk === 'object' || result.current.sdk === null,
      ).toBe(true);

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
      setupMockUseSelector(undefined, mockCardFeatureFlag);

      const TestComponent = () => <div>Test Child</div>;

      render(
        <CardSDKProvider>
          <TestComponent />
        </CardSDKProvider>,
      );

      expect(MockedCardholderSDK).not.toHaveBeenCalled();
    });

    it('should handle undefined card feature flag gracefully', () => {
      setupMockUseSelector('0xe708', undefined);

      const TestComponent = () => <div>Test Child</div>;

      render(
        <CardSDKProvider>
          <TestComponent />
        </CardSDKProvider>,
      );

      expect(MockedCardholderSDK).not.toHaveBeenCalled();
    });

    it('should handle empty card feature flag gracefully', () => {
      setupMockUseSelector('0xe708', {});

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
