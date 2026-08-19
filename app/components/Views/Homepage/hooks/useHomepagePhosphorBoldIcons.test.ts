import { useIsFocused } from '@react-navigation/native';
import { renderHook } from '@testing-library/react-hooks';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): Icon Lab is the temporary icon-set host */
import {
  applyIconSet,
  retainPhosphorRegular,
  releasePhosphorRegular,
} from '../../Settings/IconLab/IconSetOverride';
/* eslint-enable import-x/no-restricted-paths */
import { useHomepagePhosphorBoldIcons } from './useHomepagePhosphorBoldIcons';

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(),
}));

jest.mock('../../Settings/IconLab/IconSetOverride', () => ({
  applyIconSet: jest.fn(),
  retainPhosphorRegular: jest.fn(),
  releasePhosphorRegular: jest.fn(),
}));

const mockUseIsFocused = useIsFocused as jest.MockedFunction<
  typeof useIsFocused
>;

describe('useHomepagePhosphorBoldIcons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies Phosphor regular when homepage is focused', () => {
    mockUseIsFocused.mockReturnValue(true);

    renderHook(() => useHomepagePhosphorBoldIcons());

    expect(applyIconSet).toHaveBeenCalledWith('phosphor', 'regular');
    expect(retainPhosphorRegular).toHaveBeenCalledTimes(1);
    expect(releasePhosphorRegular).not.toHaveBeenCalled();
  });

  it('does not apply Phosphor when homepage is not focused', () => {
    mockUseIsFocused.mockReturnValue(false);

    renderHook(() => useHomepagePhosphorBoldIcons());

    expect(applyIconSet).not.toHaveBeenCalled();
    expect(retainPhosphorRegular).not.toHaveBeenCalled();
  });

  it('releases Phosphor when homepage blurs', () => {
    mockUseIsFocused.mockReturnValue(true);
    const { rerender } = renderHook(() => useHomepagePhosphorBoldIcons());

    mockUseIsFocused.mockReturnValue(false);
    rerender();

    expect(releasePhosphorRegular).toHaveBeenCalledTimes(1);
  });
});
