import { useSelector } from 'react-redux';

import {
  DeepPartial,
  renderHookWithProvider,
} from '../../../../util/test/renderWithProvider';
import { RootState } from '../../../../reducers';
import { useParams } from '../../../../util/navigation/navUtils';
import { useMaxValueMode } from './useMaxValueMode';

jest.mock('../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn().mockReturnValue({
    params: {
      maxValueMode: false,
    },
  }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

describe('useMaxValueRefresher', () => {
  const mockUseSelector = jest.mocked(useSelector);
  const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

  const maxModeState = {
    transaction: {
      maxValueMode: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockImplementation(
      (fn: (state: DeepPartial<RootState>) => unknown) => fn(maxModeState),
    );
  });

  it('return true if maxValueMode is true in state', () => {
    const { result } = renderHookWithProvider(() => useMaxValueMode(), {
      state: maxModeState,
    });

    expect(result.current.maxValueMode).toEqual(true);
  });

  it('return true if maxValueMode in params is true', () => {
    mockUseParams.mockReturnValue({
      params: { maxValueMode: true },
    });
    const { result } = renderHookWithProvider(() => useMaxValueMode(), {
      state: {},
    });

    expect(result.current.maxValueMode).toEqual(true);
  });
});
