import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  getCardUkMigrationUpdateBadgeSeverity,
  isCardUkMigrationEligible,
  type CardUkMigrationState,
} from '../../../../selectors/featureFlagController/card';
import { useCardUkMigrationState } from './useCardUkMigrationState';
import { useCardUkMigrationUpdateBadge } from './useCardUkMigrationUpdateBadge';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../selectors/cardController', () => ({
  selectCardActiveProviderId: jest.fn(),
  selectCardCountryOfResidence: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController/card', () => ({
  getCardUkMigrationUpdateBadgeSeverity: jest.fn(),
  isCardUkMigrationEligible: jest.fn(),
}));

jest.mock('./useCardUkMigrationState', () => ({
  useCardUkMigrationState: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockIsCardUkMigrationEligible = jest.mocked(isCardUkMigrationEligible);
const mockGetCardUkMigrationUpdateBadgeSeverity = jest.mocked(
  getCardUkMigrationUpdateBadgeSeverity,
);
const mockUseCardUkMigrationState = jest.mocked(useCardUkMigrationState);

const migrationState: CardUkMigrationState = {
  phase: 'soft',
  isActive: true,
  deadline: new Date('2026-09-30T23:59:59.999Z'),
};

describe('useCardUkMigrationUpdateBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValueOnce('baanx').mockReturnValueOnce('GB');
    mockUseCardUkMigrationState.mockReturnValue({
      state: migrationState,
      refresh: jest.fn(),
    });
  });

  it('returns schedule severity for an eligible Baanx UK user', () => {
    mockIsCardUkMigrationEligible.mockReturnValue(true);
    mockGetCardUkMigrationUpdateBadgeSeverity.mockReturnValue('warning');

    const { result } = renderHook(() => useCardUkMigrationUpdateBadge());

    expect(mockIsCardUkMigrationEligible).toHaveBeenCalledWith(migrationState, {
      providerId: 'baanx',
      regionCode: 'GB',
    });
    expect(result.current).toBe('warning');
  });

  it('returns null without evaluating severity for an ineligible user', () => {
    mockIsCardUkMigrationEligible.mockReturnValue(false);

    const { result } = renderHook(() => useCardUkMigrationUpdateBadge());

    expect(mockGetCardUkMigrationUpdateBadgeSeverity).not.toHaveBeenCalled();
    expect(result.current).toBeNull();
  });
});
