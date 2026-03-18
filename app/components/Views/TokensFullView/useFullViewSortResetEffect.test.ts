import { renderHook } from '@testing-library/react-hooks';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Engine from '../../../core/Engine';
import { DEFAULT_TOKEN_SORT_CONFIG } from '../../UI/Tokens/util/sortAssets';
import { useFullViewSortResetEffect } from './useFullViewSortResetEffect';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

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
  const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
    typeof useFocusEffect
  >;
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

  it('registers a focus effect callback', () => {
    mockUseSelector.mockReturnValue(false);

    renderHook(() => useFullViewSortResetEffect());

    expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));
  });

  it('resets token sort config when homepage sections v1 is enabled', () => {
    mockUseSelector.mockReturnValue(true);

    renderHook(() => useFullViewSortResetEffect());

    const onFocusEffect = mockUseFocusEffect.mock.calls[0][0];
    const onCleanup = onFocusEffect();

    if (typeof onCleanup === 'function') {
      onCleanup();
    }

    expect(mockSetTokenSortConfig).toHaveBeenCalledWith(
      DEFAULT_TOKEN_SORT_CONFIG,
    );
  });

  it('does not reset token sort config when homepage sections v1 is disabled', () => {
    mockUseSelector.mockReturnValue(false);

    renderHook(() => useFullViewSortResetEffect());

    const onFocusEffect = mockUseFocusEffect.mock.calls[0][0];
    const onCleanup = onFocusEffect();

    if (typeof onCleanup === 'function') {
      onCleanup();
    }

    expect(mockSetTokenSortConfig).not.toHaveBeenCalled();
  });
});
