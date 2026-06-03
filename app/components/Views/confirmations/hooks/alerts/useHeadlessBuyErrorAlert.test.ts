import { renderHook } from '@testing-library/react-hooks';
import { useHeadlessBuyErrorAlert } from './useHeadlessBuyErrorAlert';
import { useConfirmationContext } from '../../context/confirmation-context';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';

jest.mock('../../context/confirmation-context');

describe('useHeadlessBuyErrorAlert', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns empty array when no headless buy error', () => {
    jest.mocked(useConfirmationContext).mockReturnValue({
      headlessBuyError: undefined,
    } as unknown as ReturnType<typeof useConfirmationContext>);

    const { result } = renderHook(() => useHeadlessBuyErrorAlert());

    expect(result.current).toEqual([]);
  });

  it('returns danger alert with error message when headless buy error exists', () => {
    jest.mocked(useConfirmationContext).mockReturnValue({
      headlessBuyError: 'Payment provider unavailable',
    } as unknown as ReturnType<typeof useConfirmationContext>);

    const { result } = renderHook(() => useHeadlessBuyErrorAlert());

    expect(result.current).toEqual([
      {
        key: AlertKeys.HeadlessBuyError,
        title: expect.any(String),
        message: 'Payment provider unavailable',
        severity: Severity.Danger,
      },
    ]);
  });
});
