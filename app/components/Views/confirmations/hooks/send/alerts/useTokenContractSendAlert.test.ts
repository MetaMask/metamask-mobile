import { renderHook, act } from '@testing-library/react-hooks';

import {
  memoizedGetTokenStandardAndDetails,
  type TokenDetails,
} from '../../../utils/token';
import { useSendContext } from '../../../context/send-context/send-context';
import { useSendType } from '../useSendType';
import { useTokenContractSendAlert } from './useTokenContractSendAlert';

type TokenResult = TokenDetails | Record<string, never>;

jest.mock('../../../context/send-context/send-context', () => ({
  useSendContext: jest.fn(),
}));

jest.mock('../useSendType', () => ({
  useSendType: jest.fn(),
}));

jest.mock('../../../utils/token', () => ({
  memoizedGetTokenStandardAndDetails: jest.fn(),
}));

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn().mockReturnValue('mainnet'),
    },
  },
}));

jest.mock('../../../../../../util/address', () => ({
  isValidHexAddress: jest.fn((addr: string) => addr.startsWith('0x')),
  toChecksumAddress: jest.fn((addr: string) => addr),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'send.smart_contract_address': 'Smart contract address',
      'send.smart_contract_address_warning': 'Token contract warning',
    };
    return map[key] || key;
  },
}));

const mockUseSendContext = jest.mocked(useSendContext);
const mockUseSendType = jest.mocked(useSendType);
const mockGetTokenDetails = jest.mocked(memoizedGetTokenStandardAndDetails);

describe('useTokenContractSendAlert', () => {
  const TOKEN_CONTRACT = '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477';

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSendContext.mockReturnValue({
      to: TOKEN_CONTRACT,
      chainId: '0x1',
      asset: { address: '0xDifferentAddress' },
    } as unknown as ReturnType<typeof useSendContext>);

    mockUseSendType.mockReturnValue({
      isEvmSendType: true,
    } as unknown as ReturnType<typeof useSendType>);

    mockGetTokenDetails.mockResolvedValue({});
  });

  it('returns null alert when to is missing', () => {
    mockUseSendContext.mockReturnValue({
      to: undefined,
      chainId: '0x1',
      asset: {},
    } as unknown as ReturnType<typeof useSendContext>);

    const { result } = renderHook(() => useTokenContractSendAlert());

    expect(result.current.alert).toBeNull();
    expect(result.current.isPending).toBe(false);
  });

  it('returns null alert when chainId is missing', () => {
    mockUseSendContext.mockReturnValue({
      to: TOKEN_CONTRACT,
      chainId: undefined,
      asset: {},
    } as unknown as ReturnType<typeof useSendContext>);

    const { result } = renderHook(() => useTokenContractSendAlert());

    expect(result.current.alert).toBeNull();
  });

  it('returns null alert when not an EVM send type', () => {
    mockUseSendType.mockReturnValue({
      isEvmSendType: false,
    } as unknown as ReturnType<typeof useSendType>);

    const { result } = renderHook(() => useTokenContractSendAlert());

    expect(result.current.alert).toBeNull();
  });

  it('returns null alert when to address equals asset address', () => {
    mockUseSendContext.mockReturnValue({
      to: TOKEN_CONTRACT,
      chainId: '0x1',
      asset: { address: TOKEN_CONTRACT },
    } as unknown as ReturnType<typeof useSendContext>);

    const { result } = renderHook(() => useTokenContractSendAlert());

    expect(result.current.alert).toBeNull();
  });

  it('returns alert when address is a token contract', async () => {
    mockGetTokenDetails.mockResolvedValue({
      standard: 'ERC20',
    } as Awaited<ReturnType<typeof memoizedGetTokenStandardAndDetails>>);

    const { result, waitForNextUpdate } = renderHook(() =>
      useTokenContractSendAlert(),
    );

    await waitForNextUpdate();

    expect(result.current.alert).not.toBeNull();
    expect(result.current.alert?.key).toBe('tokenContract');
    expect(result.current.alert?.title).toBe('Smart contract address');
    expect(result.current.alert?.message).toBe('Token contract warning');
    expect(result.current.isPending).toBe(false);
  });

  it('returns null alert when address is not a token contract', async () => {
    mockGetTokenDetails.mockResolvedValue({});

    const { result, waitForNextUpdate } = renderHook(() =>
      useTokenContractSendAlert(),
    );

    await waitForNextUpdate();

    expect(result.current.alert).toBeNull();
    expect(result.current.isPending).toBe(false);
  });

  it('returns null alert when token details lookup throws', async () => {
    mockGetTokenDetails.mockRejectedValue(new Error('lookup failed'));

    const { result, waitForNextUpdate } = renderHook(() =>
      useTokenContractSendAlert(),
    );

    await waitForNextUpdate();

    expect(result.current.alert).toBeNull();
    expect(result.current.isPending).toBe(false);
  });

  it('reports isPending while the token check is in progress', async () => {
    let resolvePromise: (v: TokenResult) => void = () => undefined;
    mockGetTokenDetails.mockReturnValue(
      new Promise<TokenResult>((resolve) => {
        resolvePromise = resolve;
      }),
    );

    const { result } = renderHook(() => useTokenContractSendAlert());

    expect(result.current.isPending).toBe(true);

    await act(async () => {
      resolvePromise({});
    });
  });

  it('cancels in-flight check when to changes', async () => {
    let resolveFirst: (v: TokenResult) => void = () => undefined;
    mockGetTokenDetails.mockReturnValueOnce(
      new Promise<TokenResult>((resolve) => {
        resolveFirst = resolve;
      }),
    );

    const { result, rerender } = renderHook(() => useTokenContractSendAlert());

    expect(result.current.isPending).toBe(true);

    mockUseSendContext.mockReturnValue({
      to: '0xNewAddress',
      chainId: '0x1',
      asset: { address: '0xDifferentAddress' },
    } as unknown as ReturnType<typeof useSendContext>);

    mockGetTokenDetails.mockResolvedValueOnce({});

    rerender();

    await act(async () => {
      resolveFirst({ standard: 'ERC20' } as TokenResult);
    });

    expect(result.current.alert).toBeNull();
  });
});
