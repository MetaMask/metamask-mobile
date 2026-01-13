import { waitFor } from '@testing-library/react-native';
import BN from 'bnjs4';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  EVM_NATIVE_ASSET,
  evmSendStateMock,
  SOLANA_ASSET,
  solanaSendStateMock,
} from '../../__mocks__/send.mock';
import {
  useAmountValidation,
  validateERC1155Balance,
  validateTokenBalance,
  validatePositiveNumericString,
} from './useAmountValidation';
import { AssetType, TokenStandard } from '../../types/token';
// eslint-disable-next-line import/no-namespace
import * as SendContext from '../../context/send-context/send-context';
const MOCK_ADDRESS_1 = '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc';

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => ({}),
}));

describe('validateERC1155Balance', () => {
  it('return error if amount is greater than balance and not otherwise', () => {
    expect(
      validateERC1155Balance(
        { balance: 5, standard: TokenStandard.ERC1155 } as unknown as AssetType,
        '5',
      ),
    ).toEqual(undefined);
    expect(
      validateERC1155Balance(
        { balance: 5, standard: TokenStandard.ERC1155 } as unknown as AssetType,
        '1',
      ),
    ).toEqual(undefined);
    expect(
      validateERC1155Balance(
        { balance: 5, standard: TokenStandard.ERC1155 } as unknown as AssetType,
        '10',
      ),
    ).toEqual('Insufficient funds');
  });

  it('returns undefined when asset has no balance', () => {
    expect(
      validateERC1155Balance(
        { standard: TokenStandard.ERC1155 } as unknown as AssetType,
        '10',
      ),
    ).toEqual(undefined);
  });

  it('returns undefined when value is undefined or empty', () => {
    expect(
      validateERC1155Balance(
        { balance: 5, standard: TokenStandard.ERC1155 } as unknown as AssetType,
        undefined,
      ),
    ).toEqual(undefined);
    expect(
      validateERC1155Balance(
        { balance: 5, standard: TokenStandard.ERC1155 } as unknown as AssetType,
        '',
      ),
    ).toEqual(undefined);
  });

  it('returns undefined when asset is undefined', () => {
    expect(
      validateERC1155Balance(undefined as unknown as AssetType, '10'),
    ).toEqual(undefined);
  });
});

describe('validatePositiveNumericString', () => {
  it('returns undefined for valid positive numeric strings', () => {
    expect(validatePositiveNumericString('123')).toEqual(undefined);
    expect(validatePositiveNumericString('0.5')).toEqual(undefined);
    expect(validatePositiveNumericString('1.234567')).toEqual(undefined);
    expect(validatePositiveNumericString('0')).toEqual(undefined);
  });

  it('returns error for invalid numeric strings', () => {
    expect(validatePositiveNumericString('abc')).toEqual('Invalid value');
    expect(validatePositiveNumericString('-5')).toEqual('Invalid value');
    expect(validatePositiveNumericString('12.34.56')).toEqual('Invalid value');
    expect(validatePositiveNumericString('12a34')).toEqual('Invalid value');
  });

  it('returns error for empty or whitespace strings', () => {
    expect(validatePositiveNumericString('')).toEqual('Invalid value');
    expect(validatePositiveNumericString('  ')).toEqual('Invalid value');
  });
});

describe('validateTokenBalance', () => {
  it('return error if amount is greater than balance and not otherwise', () => {
    expect(
      validateTokenBalance('1', new BN('1000000000000000000', 10), 18),
    ).toEqual(undefined);
    expect(
      validateTokenBalance('10', new BN('1000000000000000000', 10), 18),
    ).toEqual('Insufficient funds');
  });

  it('returns undefined when amount equals balance (boundary case)', () => {
    expect(
      validateTokenBalance('1', new BN('1000000000000000000', 10), 18),
    ).toEqual(undefined);
  });

  it('returns error when balance is zero', () => {
    expect(validateTokenBalance('1', new BN('0', 10), 18)).toEqual(
      'Insufficient funds',
    );
  });

  it('handles undefined decimals', () => {
    expect(
      validateTokenBalance('1', new BN('1000000000000000000', 10), undefined),
    ).toEqual(undefined);
  });

  it('handles very small amounts correctly', () => {
    expect(
      validateTokenBalance('0.000001', new BN('1000000000000', 10), 18),
    ).toEqual(undefined);
  });
});

describe('useAmountValidation', () => {
  it('return error for invalid amount value', async () => {
    jest.spyOn(SendContext, 'useSendContext').mockReturnValue({
      asset: EVM_NATIVE_ASSET,
      from: MOCK_ADDRESS_1,
      value: 'abc',
    } as unknown as SendContext.SendContextType);

    const { result } = renderHookWithProvider(() => useAmountValidation(), {
      state: evmSendStateMock,
    });
    await waitFor(() =>
      expect(result.current.amountError).toEqual('Invalid value'),
    );
  });

  it('return error if amount of native asset is more than balance', async () => {
    jest.spyOn(SendContext, 'useSendContext').mockReturnValue({
      asset: { ...EVM_NATIVE_ASSET, rawBalance: '0x5' },
      chainId: '0x5',
      from: MOCK_ADDRESS_1,
      value: '10',
    } as unknown as SendContext.SendContextType);

    const { result } = renderHookWithProvider(() => useAmountValidation(), {
      state: evmSendStateMock,
    });
    await waitFor(() =>
      expect(result.current.amountError).toEqual('Insufficient funds'),
    );
  });

  it('does not return error for undefined amount value', async () => {
    jest.spyOn(SendContext, 'useSendContext').mockReturnValue({
      asset: EVM_NATIVE_ASSET,
      from: MOCK_ADDRESS_1,
    } as unknown as SendContext.SendContextType);

    const { result } = renderHookWithProvider(() => useAmountValidation(), {
      state: evmSendStateMock,
    });
    await waitFor(() => expect(result.current.amountError).toEqual(undefined));
  });

  it('does not return error for empty string amount value', async () => {
    jest.spyOn(SendContext, 'useSendContext').mockReturnValue({
      asset: EVM_NATIVE_ASSET,
      from: MOCK_ADDRESS_1,
      value: '',
    } as unknown as SendContext.SendContextType);

    const { result } = renderHookWithProvider(() => useAmountValidation(), {
      state: evmSendStateMock,
    });
    await waitFor(() => expect(result.current.amountError).toEqual(undefined));
  });

  it('does not return error for null amount value', async () => {
    jest.spyOn(SendContext, 'useSendContext').mockReturnValue({
      asset: EVM_NATIVE_ASSET,
      from: MOCK_ADDRESS_1,
      value: null,
    } as unknown as SendContext.SendContextType);

    const { result } = renderHookWithProvider(() => useAmountValidation(), {
      state: evmSendStateMock,
    });
    await waitFor(() => expect(result.current.amountError).toEqual(undefined));
  });

  it('return error for negative amount value', async () => {
    jest.spyOn(SendContext, 'useSendContext').mockReturnValue({
      asset: EVM_NATIVE_ASSET,
      from: MOCK_ADDRESS_1,
      value: '-5',
    } as unknown as SendContext.SendContextType);

    const { result } = renderHookWithProvider(() => useAmountValidation(), {
      state: evmSendStateMock,
    });
    await waitFor(() =>
      expect(result.current.amountError).toEqual('Invalid value'),
    );
  });

  it('accepts valid zero amount', async () => {
    jest.spyOn(SendContext, 'useSendContext').mockReturnValue({
      asset: { ...EVM_NATIVE_ASSET, rawBalance: '0x5' },
      chainId: '0x5',
      from: MOCK_ADDRESS_1,
      value: '0',
    } as unknown as SendContext.SendContextType);

    const { result } = renderHookWithProvider(() => useAmountValidation(), {
      state: evmSendStateMock,
    });
    await waitFor(() => expect(result.current.amountError).toEqual(undefined));
  });

  it('accepts valid decimal amount', async () => {
    jest.spyOn(SendContext, 'useSendContext').mockReturnValue({
      asset: { ...EVM_NATIVE_ASSET, rawBalance: '0x5f5e100' },
      chainId: '0x5',
      from: MOCK_ADDRESS_1,
      value: '0.5',
    } as unknown as SendContext.SendContextType);

    const { result } = renderHookWithProvider(() => useAmountValidation(), {
      state: evmSendStateMock,
    });
    await waitFor(() => expect(result.current.amountError).toEqual(undefined));
  });

  it('return error for ERC1155 token with amount exceeding balance', async () => {
    jest.spyOn(SendContext, 'useSendContext').mockReturnValue({
      asset: {
        balance: 5,
        standard: TokenStandard.ERC1155,
        decimals: 0,
      },
      from: MOCK_ADDRESS_1,
      value: '10',
    } as unknown as SendContext.SendContextType);

    const { result } = renderHookWithProvider(() => useAmountValidation(), {
      state: evmSendStateMock,
    });
    await waitFor(() =>
      expect(result.current.amountError).toEqual('Insufficient funds'),
    );
  });

  it('accepts valid ERC1155 token amount within balance', async () => {
    jest.spyOn(SendContext, 'useSendContext').mockReturnValue({
      asset: {
        balance: 10,
        standard: TokenStandard.ERC1155,
        decimals: 0,
      },
      from: MOCK_ADDRESS_1,
      value: '5',
    } as unknown as SendContext.SendContextType);

    const { result } = renderHookWithProvider(() => useAmountValidation(), {
      state: evmSendStateMock,
    });
    await waitFor(() => expect(result.current.amountError).toEqual(undefined));
  });

  it('return error for ERC20 token with amount exceeding balance', async () => {
    jest.spyOn(SendContext, 'useSendContext').mockReturnValue({
      asset: {
        rawBalance: '0x2710', // 10000 in decimal
        standard: TokenStandard.ERC20,
        decimals: 18,
      },
      from: MOCK_ADDRESS_1,
      value: '100',
    } as unknown as SendContext.SendContextType);

    const { result } = renderHookWithProvider(() => useAmountValidation(), {
      state: evmSendStateMock,
    });
    await waitFor(() =>
      expect(result.current.amountError).toEqual('Insufficient funds'),
    );
  });

  it('return error for special characters in amount', async () => {
    jest.spyOn(SendContext, 'useSendContext').mockReturnValue({
      asset: EVM_NATIVE_ASSET,
      from: MOCK_ADDRESS_1,
      value: '1@23',
    } as unknown as SendContext.SendContextType);

    const { result } = renderHookWithProvider(() => useAmountValidation(), {
      state: evmSendStateMock,
    });
    await waitFor(() =>
      expect(result.current.amountError).toEqual('Invalid value'),
    );
  });

  it('validateNonEvmAmountAsync can be called manually', async () => {
    jest.spyOn(SendContext, 'useSendContext').mockReturnValue({
      asset: EVM_NATIVE_ASSET,
      from: MOCK_ADDRESS_1,
      value: '1',
    } as unknown as SendContext.SendContextType);

    const { result } = renderHookWithProvider(() => useAmountValidation(), {
      state: evmSendStateMock,
    });

    const error = await result.current.validateNonEvmAmountAsync();
    expect(error).toEqual(undefined);
  });

  it('return error when non-EVM asset has zero balance', async () => {
    jest.spyOn(SendContext, 'useSendContext').mockReturnValue({
      asset: {
        ...SOLANA_ASSET,
        rawBalance: '0x0',
      },
      from: MOCK_ADDRESS_1,
      value: '1',
    } as unknown as SendContext.SendContextType);

    const { result } = renderHookWithProvider(() => useAmountValidation(), {
      state: solanaSendStateMock,
    });

    await waitFor(() =>
      expect(result.current.amountError).toEqual('Insufficient funds'),
    );
  });
});
