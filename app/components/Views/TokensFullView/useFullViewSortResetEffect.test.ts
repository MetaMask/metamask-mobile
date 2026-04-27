import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import Engine from '../../../core/Engine';
import { DEFAULT_TOKEN_SORT_CONFIG } from '../../UI/Tokens/util/sortAssets';
import { useFullViewSortResetEffect } from './useFullViewSortResetEffect';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PreferencesController: {
        setTokenSortConfig: jest.fn(),
      },
    },
  },
}));

describe('useFullViewSortResetEffect', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockSetTokenSortConfig = Engine.context.PreferencesController
    .setTokenSortConfig as jest.MockedFunction<
    typeof Engine.context.PreferencesController.setTokenSortConfig
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resets token sort config when hook unmounts with homepage sections v1 enabled', () => {
    mockUseSelector.mockReturnValue(true);

    const { unmount } = renderHook(() => useFullViewSortResetEffect());

    unmount();

    expect(mockSetTokenSortConfig).toHaveBeenCalledWith(
      DEFAULT_TOKEN_SORT_CONFIG,
    );
  });

  it('does not reset token sort config when hook unmounts with homepage sections v1 disabled', () => {
    mockUseSelector.mockReturnValue(false);

    const { unmount } = renderHook(() => useFullViewSortResetEffect());
    unmount();

    expect(mockSetTokenSortConfig).not.toHaveBeenCalled();
  });

  it('uses the latest homepage sections v1 value on unmount', () => {
    mockUseSelector.mockReturnValue(false);
    const { rerender, unmount } = renderHook(() =>
      useFullViewSortResetEffect(),
    );

    mockUseSelector.mockReturnValue(true);
    rerender();
    unmount();

    expect(mockSetTokenSortConfig).toHaveBeenCalledWith(
      DEFAULT_TOKEN_SORT_CONFIG,
    );
  });
});
