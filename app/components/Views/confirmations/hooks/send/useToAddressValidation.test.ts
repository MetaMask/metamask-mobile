import { waitFor } from '@testing-library/react-native';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  ETHEREUM_ADDRESS,
  evmSendStateMock,
  SOLANA_ASSET,
} from '../../__mocks__/send.mock';
import { useSendContext } from '../../context/send-context';
import { useToAddressValidation } from './useToAddressValidation';
import { useParams } from '../../../../../util/navigation/navUtils';

jest.mock('../../context/send-context', () => ({
  useSendContext: jest.fn(),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

const mockState = {
  state: evmSendStateMock,
};

const mockUseSendContext = useSendContext as jest.MockedFunction<
  typeof useSendContext
>;

const mockUseParams = jest.mocked(useParams);

describe('useToAddressValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue(undefined);
  });

  it('return fields for to address error and warning', () => {
    mockUseSendContext.mockReturnValue(
      {} as unknown as ReturnType<typeof useSendContext>,
    );
    const { result } = renderHookWithProvider(
      () => useToAddressValidation(),
      mockState,
    );
    expect(result.current).toStrictEqual({
      resolvedAddress: undefined,
      toAddressError: undefined,
      toAddressValidated: undefined,
      toAddressWarning: undefined,
      resolutionProtocol: undefined,
    });
  });

  it('return no result if to address is undefined', () => {
    mockUseSendContext.mockReturnValue({
      to: undefined,
    } as unknown as ReturnType<typeof useSendContext>);
    const { result } = renderHookWithProvider(
      () => useToAddressValidation(),
      mockState,
    );
    expect(result.current).toStrictEqual({
      resolvedAddress: undefined,
      toAddressError: undefined,
      toAddressValidated: undefined,
      toAddressWarning: undefined,
      resolutionProtocol: undefined,
    });
  });

  it('validate evm address correctly', async () => {
    const { result, rerender } = renderHookWithProvider(
      () => useToAddressValidation(),
      mockState,
    );

    mockUseSendContext.mockReturnValue({
      asset: {
        name: 'Ethereum',
        address: ETHEREUM_ADDRESS,
        isNative: true,
        chainId: '0x1',
        symbol: 'ETH',
        decimals: 18,
      },
      to: '0x123',
      chainId: '0x1',
    } as unknown as ReturnType<typeof useSendContext>);

    rerender();

    await waitFor(
      () => {
        expect(result.current.toAddressValidated).toBe('0x123');
        expect(result.current.toAddressError).toBe('Invalid address');
      },
      { timeout: 3000 },
    );
  });

  it('validate solana address correctly', async () => {
    mockUseSendContext.mockReturnValue({
      asset: SOLANA_ASSET,
      to: 'dummy',
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    } as unknown as ReturnType<typeof useSendContext>);
    const { result } = renderHookWithProvider(
      () => useToAddressValidation(),
      mockState,
    );
    await waitFor(
      () => {
        expect(result.current.toAddressValidated).toBe('dummy');
        expect(result.current.toAddressError).toBe('Invalid address');
      },
      { timeout: 3000 },
    );
  });

  it('validate tron address correctly', async () => {
    mockUseSendContext.mockReturnValue({
      asset: {
        name: 'Tron',
        address: 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7',
        isNative: true,
        chainId: 'tron:1',
        symbol: 'TRX',
        decimals: 18,
      },
      to: 'dummy',
      chainId: 'tron:1',
    } as unknown as ReturnType<typeof useSendContext>);
    const { result } = renderHookWithProvider(
      () => useToAddressValidation(),
      mockState,
    );
    await waitFor(
      () => {
        expect(result.current.toAddressValidated).toBe('dummy');
        expect(result.current.toAddressError).toBe('Invalid address');
      },
      { timeout: 3000 },
    );
  });

  describe('debouncing behavior', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('debounces validation with 500ms delay', async () => {
      const mockTo = 'test.eth';
      mockUseSendContext.mockReturnValue({
        asset: {
          name: 'Ethereum',
          address: ETHEREUM_ADDRESS,
          isNative: true,
          chainId: '0x1',
          symbol: 'ETH',
          decimals: 18,
        },
        to: mockTo,
        chainId: '0x1',
      } as unknown as ReturnType<typeof useSendContext>);

      const { result } = renderHookWithProvider(
        () => useToAddressValidation(),
        mockState,
      );

      expect(result.current.toAddressValidated).toBeUndefined();

      jest.advanceTimersByTime(500);

      await waitFor(() => {
        expect(result.current.toAddressValidated).toBe(mockTo);
      });
    });

    it('validates only final address when changed rapidly', async () => {
      mockUseSendContext.mockReturnValue({
        asset: {
          name: 'Ethereum',
          address: ETHEREUM_ADDRESS,
          isNative: true,
          chainId: '0x1',
          symbol: 'ETH',
          decimals: 18,
        },
        to: 'final.eth',
        chainId: '0x1',
      } as unknown as ReturnType<typeof useSendContext>);

      const { result } = renderHookWithProvider(
        () => useToAddressValidation(),
        mockState,
      );

      jest.advanceTimersByTime(500);

      await waitFor(() => {
        expect(result.current.toAddressValidated).toBe('final.eth');
      });
    });
  });

  describe('resolvable name support', () => {
    it('validates email-like format names', async () => {
      mockUseSendContext.mockReturnValue({
        asset: {
          name: 'Ethereum',
          address: ETHEREUM_ADDRESS,
          isNative: true,
          chainId: '0x1',
          symbol: 'ETH',
          decimals: 18,
        },
        to: 'user@protocol',
        chainId: '0x1',
      } as unknown as ReturnType<typeof useSendContext>);

      const { result } = renderHookWithProvider(
        () => useToAddressValidation(),
        mockState,
      );

      await waitFor(
        () => {
          expect(result.current.toAddressValidated).toBe('user@protocol');
        },
        { timeout: 3000 },
      );
    });

    it('validates scheme-based format names', async () => {
      mockUseSendContext.mockReturnValue({
        asset: {
          name: 'Ethereum',
          address: ETHEREUM_ADDRESS,
          isNative: true,
          chainId: '0x1',
          symbol: 'ETH',
          decimals: 18,
        },
        to: 'lens:username',
        chainId: '0x1',
      } as unknown as ReturnType<typeof useSendContext>);

      const { result } = renderHookWithProvider(
        () => useToAddressValidation(),
        mockState,
      );

      await waitFor(
        () => {
          expect(result.current.toAddressValidated).toBe('lens:username');
        },
        { timeout: 3000 },
      );
    });

    it('returns resolutionProtocol when name is resolved', async () => {
      mockUseSendContext.mockReturnValue({
        asset: {
          name: 'Ethereum',
          address: ETHEREUM_ADDRESS,
          isNative: true,
          chainId: '0x1',
          symbol: 'ETH',
          decimals: 18,
        },
        to: 'test.lens',
        chainId: '0x1',
      } as unknown as ReturnType<typeof useSendContext>);

      const { result } = renderHookWithProvider(
        () => useToAddressValidation(),
        mockState,
      );

      await waitFor(
        () => {
          expect(result.current.toAddressValidated).toBe('test.lens');
        },
        { timeout: 3000 },
      );
    });
  });
});
