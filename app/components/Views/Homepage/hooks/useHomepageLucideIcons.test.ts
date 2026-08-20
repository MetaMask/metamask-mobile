import { useIsFocused } from '@react-navigation/native';
import { renderHook } from '@testing-library/react-hooks';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): Icon Lab is the temporary icon-set host */
import {
  applyIconSet,
  retainLucide,
  releaseLucide,
} from '../../Settings/IconLab/IconSetOverride';
/* eslint-enable import-x/no-restricted-paths */
import { useHomepageLucideIcons } from './useHomepageLucideIcons';

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(),
}));

jest.mock('../../Settings/IconLab/IconSetOverride', () => ({
  applyIconSet: jest.fn(),
  HOMEPAGE_LUCIDE_STROKE_WIDTH: 1.5,
  retainLucide: jest.fn(),
  releaseLucide: jest.fn(),
}));

const mockUseIsFocused = useIsFocused as jest.MockedFunction<
  typeof useIsFocused
>;

describe('useHomepageLucideIcons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies Lucide 1.5 stroke when homepage is focused', () => {
    mockUseIsFocused.mockReturnValue(true);

    renderHook(() => useHomepageLucideIcons());

    expect(applyIconSet).toHaveBeenCalledWith('lucide', 'regular', undefined, {
      strokeWidth: 1.5,
      absoluteStrokeWidth: false,
    });
    expect(retainLucide).toHaveBeenCalledTimes(1);
    expect(releaseLucide).not.toHaveBeenCalled();
  });

  it('does not apply Lucide when homepage is not focused', () => {
    mockUseIsFocused.mockReturnValue(false);

    renderHook(() => useHomepageLucideIcons());

    expect(applyIconSet).not.toHaveBeenCalled();
    expect(retainLucide).not.toHaveBeenCalled();
  });

  it('releases Lucide when homepage blurs', () => {
    mockUseIsFocused.mockReturnValue(true);
    const { rerender } = renderHook(() => useHomepageLucideIcons());

    mockUseIsFocused.mockReturnValue(false);
    rerender();

    expect(releaseLucide).toHaveBeenCalledTimes(1);
  });
});
