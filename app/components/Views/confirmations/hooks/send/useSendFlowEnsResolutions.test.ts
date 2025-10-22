import { renderHook } from '@testing-library/react-hooks';
import { useSendFlowEnsResolutions } from './useSendFlowEnsResolutions';

describe('useSendFlowEnsResolutions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores and retrieves ENS name for an address', () => {
    const { result } = renderHook(() => useSendFlowEnsResolutions());
    const chainId = '0x1';
    const ensName = 'vitalik.eth';
    const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

    result.current.setResolvedAddress(chainId, ensName, address);
    const retrieved = result.current.getResolvedENSName(chainId, address);

    expect(retrieved).toBe(ensName);
  });

  it('returns undefined for non-existent address', () => {
    const { result } = renderHook(() => useSendFlowEnsResolutions());
    const chainId = '0x1';
    const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96046';

    const retrieved = result.current.getResolvedENSName(chainId, address);

    expect(retrieved).toBeUndefined();
  });

  it('differentiates between different chain IDs', () => {
    const { result } = renderHook(() => useSendFlowEnsResolutions());
    const chainId1 = '0x1';
    const chainId2 = '0x89';
    const ensName = 'vitalik.eth';
    const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

    result.current.setResolvedAddress(chainId1, ensName, address);
    const retrieved1 = result.current.getResolvedENSName(chainId1, address);
    const retrieved2 = result.current.getResolvedENSName(chainId2, address);

    expect(retrieved1).toBe(ensName);
    expect(retrieved2).toBeUndefined();
  });

  it('returns undefined for expired cache entries', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useSendFlowEnsResolutions());
    const chainId = '0x1';
    const ensName = 'vitalik.eth';
    const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

    result.current.setResolvedAddress(chainId, ensName, address);

    jest.advanceTimersByTime(5 * 60 * 1000 + 1);

    const retrieved = result.current.getResolvedENSName(chainId, address);

    expect(retrieved).toBeUndefined();
    jest.useRealTimers();
  });

  it('returns cached entry before expiration', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useSendFlowEnsResolutions());
    const chainId = '0x1';
    const ensName = 'vitalik.eth';
    const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

    result.current.setResolvedAddress(chainId, ensName, address);

    jest.advanceTimersByTime(5 * 60 * 1000 - 1000);

    const retrieved = result.current.getResolvedENSName(chainId, address);

    expect(retrieved).toBe(ensName);
    jest.useRealTimers();
  });

  it('overwrites existing cache entry for same chain and address', () => {
    const { result } = renderHook(() => useSendFlowEnsResolutions());
    const chainId = '0x1';
    const ensName1 = 'vitalik.eth';
    const ensName2 = 'newname.eth';
    const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

    result.current.setResolvedAddress(chainId, ensName1, address);
    result.current.setResolvedAddress(chainId, ensName2, address);
    const retrieved = result.current.getResolvedENSName(chainId, address);

    expect(retrieved).toBe(ensName2);
  });
});
