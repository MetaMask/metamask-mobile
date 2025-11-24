import React from 'react';
import { Hex } from '@metamask/utils';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { MusdConversionInfo } from './musd-conversion-info';
import useNavbar from '../../../hooks/ui/useNavbar';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import { useRoute } from '@react-navigation/native';
import { strings } from '../../../../../../../locales/i18n';
import { CustomAmountInfo } from '../custom-amount-info';

jest.mock('../../../hooks/ui/useNavbar');
jest.mock('../../../hooks/tokens/useAddToken');

jest.mock('../custom-amount-info', () => ({
  CustomAmountInfo: jest.fn(() => null),
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
  const mockUseNavbar = jest.mocked(useNavbar);
  const mockUseAddToken = jest.mocked(useAddToken);
  const mockUseRoute = jest.mocked(useRoute);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders without errors when all route params provided', () => {
      const allowedPaymentTokens: Record<Hex, Hex[]> = {
        '0x1': ['0xabc' as Hex],
      };

      mockRoute.params = {
        allowedPaymentTokens,
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

      expect(mockUseNavbar).toHaveBeenCalled();
      expect(mockUseAddToken).toHaveBeenCalled();
    });
  });

  describe('navbar title', () => {
    it('calls useNavbar with earn_rewards_with title for mUSD token', () => {
      mockRoute.params = {
        outputChainId: '0x1' as Hex,
      };

      mockUseRoute.mockReturnValue(mockRoute);

      renderWithProvider(<MusdConversionInfo />, {
        state: {},
      });

      expect(mockUseNavbar).toHaveBeenCalledWith(
        strings('earn.musd_conversion.earn_rewards_with'),
      );
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

  describe('allowedPaymentTokens validation', () => {
    it('passes valid allowedPaymentTokens to CustomAmountInfo', () => {
      const allowedPaymentTokens: Record<Hex, Hex[]> = {
        '0x1': ['0xabc' as Hex],
      };

      mockRoute.params = {
        allowedPaymentTokens,
        outputChainId: '0x1' as Hex,
      };

      mockUseRoute.mockReturnValue(mockRoute);

      renderWithProvider(<MusdConversionInfo />, {
        state: {},
      });

      expect(CustomAmountInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          allowedPaymentTokens,
        }),
        expect.anything(),
      );
    });

    it('warns and passes undefined when allowedPaymentTokens is invalid', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const invalidAllowedTokens = {
        notHex: ['0xabc'],
      };

      mockRoute.params = {
        allowedPaymentTokens: invalidAllowedTokens,
        outputChainId: '0x1' as Hex,
      };

      mockUseRoute.mockReturnValue(mockRoute);

      renderWithProvider(<MusdConversionInfo />, {
        state: {},
      });

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid allowedPaymentTokens structure'),
        invalidAllowedTokens,
      );
      expect(CustomAmountInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          allowedPaymentTokens: undefined,
        }),
        expect.anything(),
      );

      consoleWarnSpy.mockRestore();
    });

    it('passes undefined to CustomAmountInfo when allowedPaymentTokens not provided', () => {
      mockRoute.params = {
        outputChainId: '0x1' as Hex,
      };

      mockUseRoute.mockReturnValue(mockRoute);

      renderWithProvider(<MusdConversionInfo />, {
        state: {},
      });

      expect(CustomAmountInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          allowedPaymentTokens: undefined,
        }),
        expect.anything(),
      );
    });
  });

  describe.skip('preferredPaymentToken', () => {
    it('passes preferredPaymentToken to CustomAmountInfo when provided', () => {
      const preferredPaymentToken = {
        address: '0xdef' as Hex,
        chainId: '0x1' as Hex,
      };

      mockRoute.params = {
        preferredPaymentToken,
        outputToken: {
          address: '0x123' as Hex,
          chainId: '0x1' as Hex,
          symbol: 'TEST',
          name: 'Test Token',
          decimals: 6,
        },
      };

      mockUseRoute.mockReturnValue(mockRoute);

      renderWithProvider(<MusdConversionInfo />, {
        state: {},
      });

      expect(CustomAmountInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          preferredPaymentToken,
        }),
        expect.anything(),
      );
    });
  });
});
