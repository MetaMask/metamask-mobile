import { waitFor } from '@testing-library/react-native';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  ETHEREUM_ADDRESS,
  evmSendStateMock,
  SOLANA_ASSET,
} from '../../__mocks__/send.mock';
import { useSendContext } from '../../context/send-context';
import { useToAddressValidation } from './useToAddressValidation';

jest.mock('../../context/send-context', () => ({
  useSendContext: jest.fn(),
}));

const mockState = {
  state: evmSendStateMock,
};

const mockUseSendContext = useSendContext as jest.MockedFunction<
  typeof useSendContext
>;

describe('useToAddressValidation', () => {
  it('return fields for to address error and warning', () => {
    mockUseSendContext.mockReturnValue(
      {} as unknown as ReturnType<typeof useSendContext>,
    );
    const { result } = renderHookWithProvider(
      () => useToAddressValidation(),
      mockState,
    );
    expect(result.current).toStrictEqual({
      loading: true,
      resolvedAddress: undefined,
      toAddressError: undefined,
      toAddressValidated: undefined,
      toAddressWarning: undefined,
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
      loading: true,
      resolvedAddress: undefined,
      toAddressError: undefined,
      toAddressValidated: undefined,
      toAddressWarning: undefined,
    });
  });

  it('validate evm address correctly', async () => {
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
    const { result } = renderHookWithProvider(
      () => useToAddressValidation(),
      mockState,
    );
    await waitFor(() => {
      expect(result.current).toStrictEqual({
        loading: true,
        resolvedAddress: undefined,
        toAddressError: 'Invalid address',
        toAddressValidated: '0x123',
        toAddressWarning: undefined,
      });
    });
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
    await waitFor(() => {
      expect(result.current).toStrictEqual({
        loading: false,
        resolvedAddress: undefined,
        toAddressError: 'Invalid address',
        toAddressValidated: 'dummy',
        toAddressWarning: undefined,
      });
    });
  });
});
