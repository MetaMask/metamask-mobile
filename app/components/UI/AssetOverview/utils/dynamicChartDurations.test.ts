import {
  formatDurationForDisplay,
  sortDurationsByLength,
} from './dynamicChartDurations';

describe('formatDurationForDisplay', () => {
  it('formats years correctly', () => {
    expect(formatDurationForDisplay('P1Y')).toBe('1Y');
    expect(formatDurationForDisplay('P2Y')).toBe('2Y');
    expect(formatDurationForDisplay('P10Y')).toBe('10Y');
  });

  it('formats months correctly', () => {
    expect(formatDurationForDisplay('P1M')).toBe('1M');
    expect(formatDurationForDisplay('P3M')).toBe('3M');
    expect(formatDurationForDisplay('P6M')).toBe('6M');
  });

  it('formats weeks correctly', () => {
    expect(formatDurationForDisplay('P1W')).toBe('1W');
    expect(formatDurationForDisplay('P2W')).toBe('2W');
    expect(formatDurationForDisplay('P4W')).toBe('4W');
  });

  it('formats days correctly', () => {
    expect(formatDurationForDisplay('P1D')).toBe('1D');
    expect(formatDurationForDisplay('P3D')).toBe('3D');
    expect(formatDurationForDisplay('P7D')).toBe('7D');
  });

  it('handles complex durations by using the largest unit', () => {
    expect(formatDurationForDisplay('P1Y2M3W4D')).toBe('1Y');
    expect(formatDurationForDisplay('P2M3W4D')).toBe('2M');
    expect(formatDurationForDisplay('P3W4D')).toBe('3W');
  });

  it('handles zero durations', () => {
    expect(formatDurationForDisplay('P0D')).toBe('0D');
  });
});

describe('sortDurationsByLength', () => {
  it('sorts durations from shortest to longest', () => {
    const durations = ['P1Y', 'P1D', 'P1M', 'P1W'];
    const sorted = sortDurationsByLength(durations);
    expect(sorted).toEqual(['P1D', 'P1W', 'P1M', 'P1Y']);
  });

  it('handles complex durations', () => {
    const durations = ['P1Y2M', 'P6M', 'P1Y', 'P3M'];
    const sorted = sortDurationsByLength(durations);
    expect(sorted).toEqual(['P3M', 'P6M', 'P1Y', 'P1Y2M']);
  });

  it('handles empty array', () => {
    expect(sortDurationsByLength([])).toEqual([]);
  });

  it('handles array with single duration', () => {
    expect(sortDurationsByLength(['P1D'])).toEqual(['P1D']);
  });

  it('maintains stable sort for equal durations', () => {
    const durations = ['P1D', 'P1D', 'P1D'];
    const sorted = sortDurationsByLength(durations);
    expect(sorted).toEqual(['P1D', 'P1D', 'P1D']);
  });
});
