import React from 'react';
import { Hex } from '@metamask/utils';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { MusdConversionInfo } from './musd-conversion-info';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import { CustomAmountInfo } from '../custom-amount-info';
import { useCustomAmount } from '../../../hooks/earn/useCustomAmount';
import { useTransactionPayAvailableTokens } from '../../../hooks/pay/useTransactionPayAvailableTokens';
import { useMusdConversionNavbar } from '../../../../../UI/Earn/hooks/useMusdConversionNavbar';
import { useParams } from '../../../../../../util/navigation/navUtils';

jest.mock('../../../hooks/tokens/useAddToken');
jest.mock('../../../hooks/earn/useCustomAmount');
jest.mock('../../../hooks/pay/useTransactionPayAvailableTokens');
jest.mock('../../../../../UI/Earn/hooks/useMusdConversionNavbar');
jest.mock('../../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));
jest.mock('../../../../../../util/trace', () => ({
  endTrace: jest.fn(),
  TraceName: {
    MusdConversionNavigation: 'mUSD Conversion Navigation',
  },
}));
const mockStartQuoteTrace = jest.fn();
jest.mock('../../../../../UI/Earn/hooks/useMusdConversionQuoteTrace', () => ({
  useMusdConversionQuoteTrace: () => ({ startQuoteTrace: mockStartQuoteTrace }),
}));

jest.mock('../custom-amount-info', () => ({
  CustomAmountInfo: jest.fn(() => null),
}));

jest.mock('../../rows/pay-with-row', () => ({
  PayWithRow: jest.fn(() => null),
}));

interface MockParams {
  preferredPaymentToken?: {
    address: Hex;
    chainId: Hex;
  };
}

const mockParams: MockParams = {
  preferredPaymentToken: {
    address: '0xdef' as Hex,
    chainId: '0x1' as Hex,
  },
};

describe('MusdConversionInfo', () => {
  const mockUseAddToken = jest.mocked(useAddToken);
  const mockUseParams = jest.mocked(useParams);
  const mockUseCustomAmount = jest.mocked(useCustomAmount);
  const mockUseTransactionPayAvailableTokens = jest.mocked(
    useTransactionPayAvailableTokens,
  );
  const mockUseMusdConversionNavbar = jest.mocked(useMusdConversionNavbar);

  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.preferredPaymentToken = {
      address: '0xdef' as Hex,
      chainId: '0x1' as Hex,
    };
    mockUseParams.mockReturnValue(mockParams);
    mockUseMusdConversionNavbar.mockReturnValue(undefined);
    mockUseCustomAmount.mockReturnValue({
      shouldShowOutputAmountTag: false,
      outputAmount: null,
      outputSymbol: null,
    });
    mockUseTransactionPayAvailableTokens.mockReturnValue({
      availableTokens: [],
      hasTokens: false,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders without errors when preferredPaymentToken is provided', () => {
      mockUseParams.mockReturnValue({
        preferredPaymentToken: {
          address: '0xdef' as Hex,
          chainId: '0x1' as Hex,
        },
      });

      renderWithProvider(<MusdConversionInfo />, {
        state: {},
      });

      expect(mockUseAddToken).toHaveBeenCalled();
    });

    it('throws error when preferredPaymentToken is missing from params', () => {
      mockUseParams.mockReturnValue({});

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      try {
        expect(() =>
          renderWithProvider(<MusdConversionInfo />, {
            state: {},
          }),
        ).toThrow('Preferred payment token chainId is required');
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });

    it('throws error when mUSD token address is unavailable for preferred chain', () => {
      mockUseParams.mockReturnValue({
        preferredPaymentToken: {
          address: '0xdef' as Hex,
          chainId: '0x999999' as Hex,
        },
      });

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      try {
        expect(() =>
          renderWithProvider(<MusdConversionInfo />, {
            state: {},
          }),
        ).toThrow('mUSD token address not found for chain ID: 0x999999');
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });
  });

  describe('useAddToken', () => {
    it('calls useAddToken with mUSD token info', () => {
      renderWithProvider(<MusdConversionInfo />, {
        state: {},
      });

      expect(mockUseAddToken).toHaveBeenCalledWith({
        chainId: '0x1',
        decimals: 6,
        name: 'MetaMask USD',
        symbol: 'mUSD',
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

      mockUseParams.mockReturnValue({
        preferredPaymentToken,
      });

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

  describe('MusdOverrideContent', () => {
    it('calls useTransactionPayAvailableTokens when rendered', () => {
      mockUseTransactionPayAvailableTokens.mockReturnValue({
        availableTokens: [{ address: '0x123' }],
        hasTokens: true,
      } as never);

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
    it('calls useMusdConversionNavbar', () => {
      renderWithProvider(<MusdConversionInfo />, {
        state: {},
      });

      expect(mockUseMusdConversionNavbar).toHaveBeenCalledWith();
    });
  });
});
