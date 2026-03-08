import { renderHook, act } from '@testing-library/react-native';
import { useRemoveToken } from './useRemoveToken';
import type { TokenI } from '../types';

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockRemoveEvmToken = jest.fn().mockResolvedValue(undefined);
const mockRemoveNonEvmToken = jest.fn().mockResolvedValue(undefined);
const mockIsNonEvmChainId = jest.fn().mockReturnValue(false);
const mockSelectInternalAccountByScope = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector: (...args: unknown[]) => unknown) =>
    selector({} as never),
  ),
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../../selectors/networkController', () => ({
  selectChainId: () => '0x1',
}));

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: () => mockSelectInternalAccountByScope,
}));

jest.mock('../util', () => ({
  removeEvmToken: (...args: unknown[]) => mockRemoveEvmToken(...args),
  removeNonEvmToken: (...args: unknown[]) => mockRemoveNonEvmToken(...args),
}));

jest.mock('../../../../core/Multichain/utils', () => ({
  isNonEvmChainId: (...args: unknown[]) => mockIsNonEvmChainId(...args),
}));

const makeToken = (overrides: Partial<TokenI> = {}): TokenI => ({
  address: '0xtoken1',
  name: 'Test Token',
  symbol: 'TKN',
  decimals: 18,
  image: '',
  balance: '100',
  logo: undefined,
  isETH: false,
  chainId: '0x1',
  ...overrides,
});

describe('useRemoveToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsNonEvmChainId.mockReturnValue(false);
  });

  it('initializes with hidden state', () => {
    const { result } = renderHook(() => useRemoveToken());

    expect(result.current.removeTokenState.isVisible).toBe(false);
    expect(result.current.showScamWarningModal).toBe(false);
  });

  it('sets removeTokenState visible when showRemoveMenu is called', () => {
    const { result } = renderHook(() => useRemoveToken());
    const token = makeToken();

    act(() => {
      result.current.showRemoveMenu(token);
    });

    expect(result.current.removeTokenState.isVisible).toBe(true);
    expect(
      result.current.removeTokenState.isVisible &&
        result.current.removeTokenState.token,
    ).toBe(token);
  });

  it('resets state when handleClose is called', () => {
    const { result } = renderHook(() => useRemoveToken());

    act(() => {
      result.current.showRemoveMenu(makeToken());
    });

    expect(result.current.removeTokenState.isVisible).toBe(true);

    act(() => {
      result.current.handleClose();
    });

    expect(result.current.removeTokenState.isVisible).toBe(false);
  });

  it('calls removeEvmToken for EVM tokens', async () => {
    const { result } = renderHook(() => useRemoveToken());
    const token = makeToken({ chainId: '0x1' });

    act(() => {
      result.current.showRemoveMenu(token);
    });

    await act(async () => {
      await result.current.removeToken();
    });

    expect(mockRemoveEvmToken).toHaveBeenCalledTimes(1);
    expect(mockRemoveNonEvmToken).not.toHaveBeenCalled();
    expect(result.current.removeTokenState.isVisible).toBe(false);
  });

  it('calls removeNonEvmToken for non-EVM tokens', async () => {
    mockIsNonEvmChainId.mockReturnValue(true);
    const { result } = renderHook(() => useRemoveToken());
    const token = makeToken({
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      address: '0xsoltoken',
    });

    act(() => {
      result.current.showRemoveMenu(token);
    });

    await act(async () => {
      await result.current.removeToken();
    });

    expect(mockRemoveNonEvmToken).toHaveBeenCalledTimes(1);
    expect(mockRemoveEvmToken).not.toHaveBeenCalled();
    expect(result.current.removeTokenState.isVisible).toBe(false);
  });

  it('does nothing when removeToken is called with hidden state', async () => {
    const { result } = renderHook(() => useRemoveToken());

    await act(async () => {
      await result.current.removeToken();
    });

    expect(mockRemoveEvmToken).not.toHaveBeenCalled();
    expect(mockRemoveNonEvmToken).not.toHaveBeenCalled();
  });

  it('skips removal when token has no chainId', async () => {
    const { result } = renderHook(() => useRemoveToken());
    const token = makeToken({ chainId: undefined });

    act(() => {
      result.current.showRemoveMenu(token);
    });

    await act(async () => {
      await result.current.removeToken();
    });

    expect(mockRemoveEvmToken).not.toHaveBeenCalled();
    expect(mockRemoveNonEvmToken).not.toHaveBeenCalled();
    expect(result.current.removeTokenState.isVisible).toBe(false);
  });

  it('sets and clears showScamWarningModal via setShowScamWarningModal', () => {
    const { result } = renderHook(() => useRemoveToken());

    expect(result.current.showScamWarningModal).toBeNull();

    act(() => {
      result.current.setShowScamWarningModal('0x1');
    });

    expect(result.current.showScamWarningModal).toBe('0x1');

    act(() => {
      result.current.setShowScamWarningModal(null);
    });

    expect(result.current.showScamWarningModal).toBeNull();
  });
});
