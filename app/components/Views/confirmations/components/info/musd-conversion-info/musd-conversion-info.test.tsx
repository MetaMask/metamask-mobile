import React from 'react';
import { Hex } from '@metamask/utils';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { MusdConversionInfo } from './musd-conversion-info';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import { useRoute } from '@react-navigation/native';
import { CustomAmountInfo } from '../custom-amount-info';
import { useCustomAmount } from '../../../hooks/earn/useCustomAmount';
import { useTransactionPayAvailableTokens } from '../../../hooks/pay/useTransactionPayAvailableTokens';
import { useMusdConversionNavbar } from '../../../../../UI/Earn/hooks/useMusdConversionNavbar';
import { strings } from '../../../../../../../locales/i18n';

jest.mock('../../../hooks/tokens/useAddToken');
jest.mock('../../../hooks/earn/useCustomAmount');
jest.mock('../../../hooks/pay/useTransactionPayAvailableTokens');
jest.mock('../../../../../UI/Earn/hooks/useMusdConversionNavbar');
jest.mock('../../../../../../util/trace', () => ({
  endTrace: jest.fn(),
  TraceName: {
    MusdConversionNavigation: 'mUSD Conversion Navigation',
  },
}));
jest.mock('../../../../../UI/Earn/hooks/useMusdConversionQuoteTrace', () => ({
  useMusdConversionQuoteTrace: jest.fn(),
}));

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
  const mockUseCustomAmount = jest.mocked(useCustomAmount);
  const mockUseTransactionPayAvailableTokens = jest.mocked(
    useTransactionPayAvailableTokens,
  );
  const mockUseMusdConversionNavbar = jest.mocked(useMusdConversionNavbar);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMusdConversionNavbar.mockReturnValue(undefined);
    mockUseCustomAmount.mockReturnValue({
      shouldShowOutputAmountTag: false,
      outputAmount: null,
      outputSymbol: null,
    });
    mockUseTransactionPayAvailableTokens.mockReturnValue([]);
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

  describe('overrideContent', () => {
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

  describe('footerText', () => {
    it('passes footerText to CustomAmountInfo', () => {
      mockRoute.params = {
        outputChainId: '0x1' as Hex,
      };

      mockUseRoute.mockReturnValue(mockRoute);

      renderWithProvider(<MusdConversionInfo />, {
        state: {},
      });

      expect(CustomAmountInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          footerText: strings('earn.musd_conversion.powered_by_relay'),
        }),
        expect.anything(),
      );
    });
  });

  describe('MusdOverrideContent', () => {
    it('calls useTransactionPayAvailableTokens when rendered', () => {
      mockRoute.params = {
        outputChainId: '0x1' as Hex,
      };

      mockUseRoute.mockReturnValue(mockRoute);
      mockUseTransactionPayAvailableTokens.mockReturnValue([
        { address: '0x123' },
      ] as never);

      renderWithProvider(<MusdConversionInfo />, {
        state: {},
      });

      const mockCustomAmountInfo = jest.mocked(CustomAmountInfo);
      const overrideContent = mockCustomAmountInfo.mock.calls[0][0]
        .overrideContent as (amountHuman: string) => React.ReactNode;

      renderWithProvider(<>{overrideContent('100')}</>, {
        state: {},
      });

      expect(mockUseTransactionPayAvailableTokens).toHaveBeenCalled();
    });
  });

  describe('useMusdConversionNavbar', () => {
    it('calls useMusdConversionNavbar with outputChainId', () => {
      mockRoute.params = {
        outputChainId: '0xe708' as Hex,
      };

      mockUseRoute.mockReturnValue(mockRoute);

      renderWithProvider(<MusdConversionInfo />, {
        state: {},
      });

      expect(mockUseMusdConversionNavbar).toHaveBeenCalledWith('0xe708');
    });
  });
});
