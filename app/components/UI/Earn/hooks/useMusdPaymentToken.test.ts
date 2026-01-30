import { renderHook, act } from '@testing-library/react-hooks';
import { Hex } from '@metamask/utils';
import { AssetType } from '../../../Views/confirmations/types/token';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { useTransactionPayToken } from '../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import { replaceMusdConversionTransactionForPayToken } from '../utils/musdConversionTransaction';
import { useMusdPaymentToken } from './useMusdPaymentToken';

jest.mock(
  '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest',
);
jest.mock('../../../Views/confirmations/hooks/pay/useTransactionPayToken');
jest.mock('../utils/musdConversionTransaction');

const mockUseTransactionMetadataRequest =
  useTransactionMetadataRequest as jest.MockedFunction<
    typeof useTransactionMetadataRequest
  >;

const mockUseTransactionPayToken =
  useTransactionPayToken as jest.MockedFunction<typeof useTransactionPayToken>;

const mockReplaceMusdConversionTransactionForPayToken =
  replaceMusdConversionTransactionForPayToken as jest.MockedFunction<
    typeof replaceMusdConversionTransactionForPayToken
  >;

interface MinimalTransactionMeta {
  chainId?: Hex;
}

const createToken = (overrides: Partial<AssetType> = {}): AssetType => ({
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as Hex,
  chainId: '0x1' as Hex,
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  balance: '0',
  fiat: {
    balance: 0,
    currency: 'usd',
    conversionRate: 1,
  },
  logo: 'https://example.com/usdc.png',
  isETH: false,
  aggregators: [],
  image: 'https://example.com/usdc.png',
  ...overrides,
});

const createTransactionMeta = (
  overrides: Partial<MinimalTransactionMeta> = {},
): MinimalTransactionMeta => ({
  chainId: '0x1' as Hex,
  ...overrides,
});

const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('useMusdPaymentToken', () => {
  const mockSetPayToken = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseTransactionPayToken.mockReturnValue({
      setPayToken: mockSetPayToken,
    } as unknown as ReturnType<typeof useTransactionPayToken>);

    mockUseTransactionMetadataRequest.mockReturnValue(
      createTransactionMeta() as unknown as ReturnType<
        typeof useTransactionMetadataRequest
      >,
    );

    mockReplaceMusdConversionTransactionForPayToken.mockResolvedValue(
      undefined as never,
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('return values', () => {
    it('returns object with onPaymentTokenChange function', () => {
      const { result } = renderHook(() => useMusdPaymentToken());

      expect(result.current).toHaveProperty('onPaymentTokenChange');
      expect(typeof result.current.onPaymentTokenChange).toBe('function');
    });
  });

  describe('onPaymentTokenChange', () => {
    it('calls setPayToken with token address and chainId when token chain matches transaction chain', () => {
      const token = createToken({ chainId: '0x1' as Hex });

      const { result } = renderHook(() => useMusdPaymentToken());

      result.current.onPaymentTokenChange(token);

      expect(
        mockReplaceMusdConversionTransactionForPayToken,
      ).not.toHaveBeenCalled();
      expect(mockSetPayToken).toHaveBeenCalledWith({
        address: token.address as Hex,
        chainId: token.chainId as Hex,
      });
    });

    it('treats chainId comparison as case-insensitive', () => {
      const token = createToken({ chainId: '0xE708' as unknown as Hex });
      mockUseTransactionMetadataRequest.mockReturnValue(
        createTransactionMeta({
          chainId: '0xe708' as Hex,
        }) as unknown as ReturnType<typeof useTransactionMetadataRequest>,
      );

      const { result } = renderHook(() => useMusdPaymentToken());

      result.current.onPaymentTokenChange(token);

      expect(
        mockReplaceMusdConversionTransactionForPayToken,
      ).not.toHaveBeenCalled();
      expect(mockSetPayToken).toHaveBeenCalledWith({
        address: token.address as Hex,
        chainId: token.chainId as Hex,
      });
    });

    it('calls replaceMusdConversionTransactionForPayToken and returns early when token chain differs from transaction chain', () => {
      const transactionMeta = createTransactionMeta({ chainId: '0x1' as Hex });
      mockUseTransactionMetadataRequest.mockReturnValue(
        transactionMeta as unknown as ReturnType<
          typeof useTransactionMetadataRequest
        >,
      );
      const token = createToken({
        chainId: '0xe708' as Hex,
        address: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff' as Hex,
      });

      const { result } = renderHook(() => useMusdPaymentToken());

      result.current.onPaymentTokenChange(token);

      expect(
        mockReplaceMusdConversionTransactionForPayToken,
      ).toHaveBeenCalledWith(
        transactionMeta as unknown as ReturnType<
          typeof useTransactionMetadataRequest
        >,
        {
          address: token.address as Hex,
          chainId: token.chainId as Hex,
        },
      );
      expect(mockSetPayToken).not.toHaveBeenCalled();
    });

    it('logs console.error when replaceMusdConversionTransactionForPayToken rejects', async () => {
      const transactionMeta = createTransactionMeta({ chainId: '0x1' as Hex });
      mockUseTransactionMetadataRequest.mockReturnValue(
        transactionMeta as unknown as ReturnType<
          typeof useTransactionMetadataRequest
        >,
      );
      const token = createToken({
        chainId: '0xe708' as Hex,
        address: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff' as Hex,
      });
      const error = new Error('replace failed');
      mockReplaceMusdConversionTransactionForPayToken.mockRejectedValueOnce(
        error,
      );

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const { result } = renderHook(() => useMusdPaymentToken());

      await act(async () => {
        result.current.onPaymentTokenChange(token);

        await flushMicrotasks();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[mUSD Conversion] Failed to replace transaction from PayWithModal',
        error,
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
