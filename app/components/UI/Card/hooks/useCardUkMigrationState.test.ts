import { act, renderHook } from '@testing-library/react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useCardUkMigrationState } from './useCardUkMigrationState';
import { resolveCardUkMigrationState } from '../../../../selectors/featureFlagController/card';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController/card', () => ({
  ...jest.requireActual('../../../../selectors/featureFlagController/card'),
  resolveCardUkMigrationState: jest.fn(),
}));

const mockUseFocusEffect = jest.mocked(useFocusEffect);
const mockUseSelector = jest.mocked(useSelector);
const mockResolve = jest.mocked(resolveCardUkMigrationState);

describe('useCardUkMigrationState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue({
      cardUkMigration: {
        enabled: true,
        minimumVersion: '0.0.0',
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2026-09-30T23:59:59.999Z',
      },
    });
    mockResolve.mockReturnValue({
      phase: 'soft',
      isActive: true,
      deadline: new Date('2026-09-30T23:59:59.999Z'),
    });
    // Do not auto-run focus callbacks; tests call refresh explicitly.
    mockUseFocusEffect.mockImplementation(() => undefined);
  });

  it('resolves migration state from remote flags with the current time', () => {
    const { result } = renderHook(() => useCardUkMigrationState());

    expect(mockResolve).toHaveBeenCalled();
    const [, evaluationTime] = mockResolve.mock.calls[0];
    expect(evaluationTime).toBeInstanceOf(Date);
    expect(result.current.state.phase).toBe('soft');
  });

  it('re-resolves when refresh is called so soft can become forced', () => {
    let resolveCount = 0;
    mockResolve.mockImplementation(() => {
      resolveCount += 1;
      return {
        phase: resolveCount <= 1 ? 'soft' : 'forced',
        isActive: true,
        deadline: new Date('2026-09-30T23:59:59.999Z'),
      };
    });

    const { result } = renderHook(() => useCardUkMigrationState());

    expect(result.current.state.phase).toBe('soft');

    act(() => {
      result.current.refresh();
    });

    expect(result.current.state.phase).toBe('forced');
  });
});
