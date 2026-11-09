import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { CardProviderIds } from '../../../../../../core/Engine/controllers/card-controller/provider-types';
import {
  hasPositiveSpendingCap,
  useCardRevokeAllowance,
} from './useCardRevokeAllowance';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

function mockActiveProvider(providerId: string) {
  mockUseSelector.mockImplementation(() => providerId);
}

function homeDataWithCap(spendingCap: string | undefined) {
  return {
    primaryFundingAsset: spendingCap === undefined ? null : { spendingCap },
  } as never;
}

describe('hasPositiveSpendingCap', () => {
  it('returns true for a finite allowance greater than zero', () => {
    expect(hasPositiveSpendingCap('100')).toBe(true);
    expect(hasPositiveSpendingCap('0.1')).toBe(true);
  });

  it('returns false for a numeric zero (already revoked)', () => {
    expect(hasPositiveSpendingCap('0')).toBe(false);
    expect(hasPositiveSpendingCap('0.0')).toBe(false);
  });

  it('returns false when the cap is missing, empty, or not a number', () => {
    expect(hasPositiveSpendingCap(undefined)).toBe(false);
    expect(hasPositiveSpendingCap('')).toBe(false);
    expect(hasPositiveSpendingCap('abc')).toBe(false);
  });
});

describe('useCardRevokeAllowance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('offers Unlink when Immersve has a positive spending cap', () => {
    mockActiveProvider(CardProviderIds.Immersve);

    const { result } = renderHook(() =>
      useCardRevokeAllowance(homeDataWithCap('500000000')),
    );

    expect(result.current).toBe(true);
  });

  it('hides Unlink when Immersve spending cap is a numeric zero', () => {
    mockActiveProvider(CardProviderIds.Immersve);

    const { result } = renderHook(() =>
      useCardRevokeAllowance(homeDataWithCap('0.0')),
    );

    expect(result.current).toBe(false);
  });

  it('hides Unlink when Immersve spending cap is not a number', () => {
    mockActiveProvider(CardProviderIds.Immersve);

    const { result } = renderHook(() =>
      useCardRevokeAllowance(homeDataWithCap('abc')),
    );

    expect(result.current).toBe(false);
  });

  it('hides Unlink for a non-Immersve provider even with a positive cap', () => {
    mockActiveProvider(CardProviderIds.Baanx);

    const { result } = renderHook(() =>
      useCardRevokeAllowance(homeDataWithCap('100')),
    );

    expect(result.current).toBe(false);
  });
});
