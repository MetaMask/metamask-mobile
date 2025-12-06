import React from 'react';
import { Hex } from '@metamask/utils';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { MusdConversionInfo } from './musd-conversion-info';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import { useRoute } from '@react-navigation/native';
import { CustomAmountInfo } from '../custom-amount-info';
import { useCustomAmountRewards } from '../../../hooks/earn/useCustomAmountRewards';

jest.mock('../../../hooks/tokens/useAddToken');
jest.mock('../../../hooks/earn/useCustomAmountRewards');

jest.mock('../custom-amount-info', () => ({
  CustomAmountInfo: jest.fn(() => null),
}));

jest.mock('../../rows/pay-with-row', () => ({
  PayWithRow: jest.fn(() => null),
}));

const mockRoute = {
  key: 'test-route',
  name: 'MusdConversionInfo',
  params: {},
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useRoute: jest.fn(() => mockRoute),
  };
});

describe('MusdConversionInfo', () => {
  const mockUseAddToken = jest.mocked(useAddToken);
  const mockUseRoute = jest.mocked(useRoute);
  const mockUseCustomAmountRewards = jest.mocked(useCustomAmountRewards);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCustomAmountRewards.mockReturnValue({
      shouldShowRewardsTag: false,
      estimatedPoints: null,
      onRewardsTagPress: jest.fn(),
      shouldShowOutputAmountTag: false,
      outputAmount: null,
      outputSymbol: null,
      renderRewardsTooltip: () => null,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders without errors when all route params provided', () => {
      mockRoute.params = {
        preferredPaymentToken: {
          address: '0xdef' as Hex,
          chainId: '0x1' as Hex,
        },
        outputChainId: '0x1' as Hex,
      };

      mockUseRoute.mockReturnValue(mockRoute);

      renderWithProvider(<MusdConversionInfo />, {
        state: {},
      });

      expect(mockUseAddToken).toHaveBeenCalled();
    });
  });

  describe('useAddToken', () => {
    it('calls useAddToken with mUSD token info', () => {
      mockRoute.params = {
        outputChainId: '0x1' as Hex,
      };

      mockUseRoute.mockReturnValue(mockRoute);

      renderWithProvider(<MusdConversionInfo />, {
        state: {},
      });

      expect(mockUseAddToken).toHaveBeenCalledWith({
        chainId: '0x1',
        decimals: 6,
        name: 'MUSD',
        symbol: 'MUSD',
        tokenAddress: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
      });
    });
  });

  describe('preferredPaymentToken', () => {
    it('passes preferredPaymentToken to CustomAmountInfo when provided', () => {
      const preferredPaymentToken = {
        address: '0xdef' as Hex,
        chainId: '0x1' as Hex,
      };

      mockRoute.params = {
        preferredPaymentToken,
        outputChainId: '0x1' as Hex,
      };

      mockUseRoute.mockReturnValue(mockRoute);

      renderWithProvider(<MusdConversionInfo />, {
        state: {},
      });

      expect(CustomAmountInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          preferredToken: preferredPaymentToken,
        }),
        expect.anything(),
      );
    });
  });

  describe('rewards rendering', () => {
    it('passes overrideContent function to CustomAmountInfo', () => {
      mockRoute.params = {
        outputChainId: '0x1' as Hex,
      };

      mockUseRoute.mockReturnValue(mockRoute);

      renderWithProvider(<MusdConversionInfo />, {
        state: {},
      });

      expect(CustomAmountInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          overrideContent: expect.any(Function),
        }),
        expect.anything(),
      );
    });
  });
});
