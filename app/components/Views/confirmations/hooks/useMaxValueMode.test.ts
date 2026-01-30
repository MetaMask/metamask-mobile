import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useParams } from '../../../../util/navigation/navUtils';
import { useMaxValueMode } from './useMaxValueMode';

jest.mock('../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn().mockReturnValue({
    params: {
      maxValueMode: false,
    },
  }),
}));

describe('useMaxValueMode', () => {
  const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false if maxValueMode in params is false', () => {
    mockUseParams.mockReturnValue({
      params: { maxValueMode: false },
    });
    const { result } = renderHookWithProvider(() => useMaxValueMode(), {
      state: {},
    });

    expect(result.current.maxValueMode).toEqual(false);
  });

  it('returns true if maxValueMode in params is true', () => {
    mockUseParams.mockReturnValue({
      params: { maxValueMode: true },
    });
    const { result } = renderHookWithProvider(() => useMaxValueMode(), {
      state: {},
    });

    expect(result.current.maxValueMode).toEqual(true);
  });
});
