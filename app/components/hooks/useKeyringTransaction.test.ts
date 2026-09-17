import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useKeyringTransaction } from './useKeyringTransaction';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as unknown as jest.Mock;

const solanaTx = { id: 'solanaBridge', chain: 'solana:mainnet' };

describe('useKeyringTransaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue({ transactions: [solanaTx] });
  });

  it('returns the keyring transaction matching the activity hash', () => {
    const { result } = renderHook(() => useKeyringTransaction('solanaBridge'));

    expect(result.current).toBe(solanaTx);
  });

  it('matches the keyring transaction id case-insensitively', () => {
    const { result } = renderHook(() => useKeyringTransaction('SOLANABRIDGE'));

    expect(result.current).toBe(solanaTx);
  });

  it('returns undefined when no hash or match exists', () => {
    expect(
      renderHook(() => useKeyringTransaction()).result.current,
    ).toBeUndefined();
    expect(
      renderHook(() => useKeyringTransaction('missing')).result.current,
    ).toBeUndefined();
  });
});
