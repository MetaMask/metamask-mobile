import BN from 'bnjs4';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { evmSendStateMock } from '../../__mocks__/send.mock';
import { useSendContext } from '../../context/send-context';
import { useAmountValidation } from './useAmountValidation';
import { useBalance } from './useBalance';
import { useSendType } from './useSendType';

jest.mock('../../context/send-context', () => ({
  useSendContext: jest.fn(),
}));

jest.mock('./useBalance', () => ({
  useBalance: jest.fn(),
}));

jest.mock('./useSendType', () => ({
  useSendType: jest.fn(),
}));

const mockState = {
  state: evmSendStateMock,
};

const mockUseSendContext = useSendContext as jest.MockedFunction<
  typeof useSendContext
>;

const mockUseBalance = useBalance as jest.MockedFunction<typeof useBalance>;

const mockUseSendType = useSendType as jest.MockedFunction<typeof useSendType>;

describe('useAmountValidation', () => {
  beforeEach(() => {
    mockUseSendType.mockReturnValue({
      isBitcoinSendType: false,
    } as ReturnType<typeof useSendType>);
  });

  it('return field for amount error', () => {
    mockUseSendContext.mockReturnValue({
      value: '',
    } as unknown as ReturnType<typeof useSendContext>);
    mockUseBalance.mockReturnValue({
      balance: '',
      decimals: 0,
      rawBalanceBN: new BN('0'),
    });

    const { result } = renderHookWithProvider(
      () => useAmountValidation(),
      mockState,
    );
    expect(result.current).toEqual({ amountError: undefined });
  });

  it('return undefined if value is not defined', () => {
    mockUseSendContext.mockReturnValue({
      value: '',
    } as unknown as ReturnType<typeof useSendContext>);
    mockUseBalance.mockReturnValue({
      balance: '',
      decimals: 0,
      rawBalanceBN: new BN('0'),
    });

    const { result } = renderHookWithProvider(
      () => useAmountValidation(),
      mockState,
    );
    expect(result.current.amountError).toEqual(undefined);
  });

  it('return "Invalid Value" for non decimal value', () => {
    mockUseSendContext.mockReturnValue({
      asset: {},
      value: 'abc',
    } as unknown as ReturnType<typeof useSendContext>);
    mockUseBalance.mockReturnValue({
      balance: '',
      decimals: 0,
      rawBalanceBN: new BN('0'),
    });

    const { result } = renderHookWithProvider(
      () => useAmountValidation(),
      mockState,
    );
    expect(result.current.amountError).toEqual('Invalid value');
  });

  it('return error if amount is greater than balance', () => {
    mockUseSendContext.mockReturnValue({
      value: '10',
    } as unknown as ReturnType<typeof useSendContext>);
    mockUseBalance.mockReturnValue({
      balance: '5',
      decimals: 0,
      rawBalanceBN: new BN('5'),
    });

    const { result } = renderHookWithProvider(
      () => useAmountValidation(),
      mockState,
    );
    expect(result.current.amountError).toEqual('Insufficient funds');
  });

  it('does not return error if amount is less than balance', () => {
    mockUseSendContext.mockReturnValue({
      value: '2',
    } as unknown as ReturnType<typeof useSendContext>);
    mockUseBalance.mockReturnValue({
      balance: '5',
      decimals: 0,
      rawBalanceBN: new BN('5'),
    });

    const { result } = renderHookWithProvider(
      () => useAmountValidation(),
      mockState,
    );
    expect(result.current.amountError).toEqual(undefined);
  });

  it('returns error for Bitcoin amount below minimum threshold', () => {
    mockUseSendType.mockReturnValue({
      isBitcoinSendType: true,
    } as ReturnType<typeof useSendType>);
    mockUseSendContext.mockReturnValue({
      value: '0.000005',
    } as unknown as ReturnType<typeof useSendContext>);
    mockUseBalance.mockReturnValue({
      balance: '1',
      decimals: 8,
      rawBalanceBN: new BN('100000000'),
    });

    const { result } = renderHookWithProvider(
      () => useAmountValidation(),
      mockState,
    );

    expect(result.current.amountError).toEqual('Invalid value');
  });

  it('does not return error for Bitcoin amount at minimum threshold', () => {
    mockUseSendType.mockReturnValue({
      isBitcoinSendType: true,
    } as ReturnType<typeof useSendType>);
    mockUseSendContext.mockReturnValue({
      value: '0.000006',
    } as unknown as ReturnType<typeof useSendContext>);
    mockUseBalance.mockReturnValue({
      balance: '1',
      decimals: 8,
      rawBalanceBN: new BN('100000000'),
    });

    const { result } = renderHookWithProvider(
      () => useAmountValidation(),
      mockState,
    );

    expect(result.current.amountError).toEqual(undefined);
  });

  it('does not return error for Bitcoin amount above minimum threshold', () => {
    mockUseSendType.mockReturnValue({
      isBitcoinSendType: true,
    } as ReturnType<typeof useSendType>);
    mockUseSendContext.mockReturnValue({
      value: '0.5',
    } as unknown as ReturnType<typeof useSendContext>);
    mockUseBalance.mockReturnValue({
      balance: '1',
      decimals: 8,
      rawBalanceBN: new BN('100000000'),
    });

    const { result } = renderHookWithProvider(
      () => useAmountValidation(),
      mockState,
    );

    expect(result.current.amountError).toEqual(undefined);
  });
});
