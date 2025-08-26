import React from 'react';
import { renderHook, render, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  CardSDKProvider,
  useCardSDK,
  ICardSDK,
  CardVerification,
} from './index';
import { CardSDK } from './CardSDK';
import {
  CardFeatureFlag,
  SupportedToken,
  selectCardFeatureFlag,
} from '../../../../selectors/featureFlagController/card';
import { selectChainId } from '../../../../selectors/networkController';
import { useCardholderCheck } from '../hooks/useCardholderCheck';

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

jest.mock('../hooks/useCardholderCheck', () => ({
  useCardholderCheck: jest.fn(),
}));

describe('CardSDK Context', () => {
  const MockedCardholderSDK = jest.mocked(CardSDK);
  const mockUseSelector = jest.mocked(useSelector);
  const mockSelectChainId = jest.mocked(selectChainId);
  const mockSelectCardFeatureFlag = jest.mocked(selectCardFeatureFlag);
  const mockUseCardholderCheck = jest.mocked(useCardholderCheck);

  const mockSupportedTokens: SupportedToken[] = [
    {
      address: '0x1234567890123456789012345678901234567890',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
    },
  ];

  const mockCardFeatureFlag: CardFeatureFlag = {
    constants: {
      onRampApiUrl: 'https://api.onramp.example.com',
      accountsApiUrl: 'https://api.accounts.example.com',
    },
    chains: {
      'eip155:59144': {
        enabled: true,
        tokens: mockSupportedTokens,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    MockedCardholderSDK.mockClear();
    mockSelectChainId.mockClear();
    mockSelectCardFeatureFlag.mockClear();
    mockUseSelector.mockClear();
    mockUseCardholderCheck.mockClear();
  });

  const setupMockUseSelector = (
    featureFlag: CardFeatureFlag | null | undefined,
  ) => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === mockSelectCardFeatureFlag) {
        return featureFlag;
      }
      return null;
    });
  };

  describe('CardSDKProvider', () => {
    it('should render children without crashing', () => {
      setupMockUseSelector(mockCardFeatureFlag);

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

    it('should not initialize SDK when card feature flag is missing', () => {
      setupMockUseSelector(null);

      const TestComponent = () => <div>Test Child</div>;

      render(
        <CardSDKProvider>
          <TestComponent />
        </CardSDKProvider>,
      );

      expect(MockedCardholderSDK).not.toHaveBeenCalled();
    });

    it('should use provided value prop when given', () => {
      setupMockUseSelector(mockCardFeatureFlag);

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
      setupMockUseSelector(mockCardFeatureFlag);

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
      setupMockUseSelector(mockCardFeatureFlag);

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
    it('should handle undefined card feature flag gracefully', () => {
      setupMockUseSelector(undefined);

      const TestComponent = () => <div>Test Child</div>;

      render(
        <CardSDKProvider>
          <TestComponent />
        </CardSDKProvider>,
      );

      expect(MockedCardholderSDK).not.toHaveBeenCalled();
    });

    it('should handle empty card feature flag gracefully', () => {
      setupMockUseSelector({});

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

  describe('CardVerification', () => {
    beforeEach(() => {
      mockUseCardholderCheck.mockClear();
    });

    it('should render without crashing', () => {
      const result = render(<CardVerification />);
      expect(result).toBeTruthy();
    });

    it('should call useCardholderCheck hook', () => {
      render(<CardVerification />);
      expect(mockUseCardholderCheck).toHaveBeenCalledTimes(1);
    });

    it('should return null (render nothing)', () => {
      const { toJSON } = render(<CardVerification />);
      expect(toJSON()).toBeNull();
    });

    it('should call useCardholderCheck on every render', () => {
      const { rerender } = render(<CardVerification />);
      expect(mockUseCardholderCheck).toHaveBeenCalledTimes(1);

      rerender(<CardVerification />);
      expect(mockUseCardholderCheck).toHaveBeenCalledTimes(2);
    });

    it('should be a functional component', () => {
      expect(typeof CardVerification).toBe('function');
      expect(CardVerification.prototype).toEqual({});
    });
  });
});
