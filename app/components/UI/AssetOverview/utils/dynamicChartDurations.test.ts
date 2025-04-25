import {
  formatDurationForDisplay,
  sortDurationsByLength,
} from './dynamicChartDurations';

describe('formatDurationForDisplay', () => {
  it('formats years correctly', () => {
    expect(formatDurationForDisplay('P1Y')).toBe('1y');
    expect(formatDurationForDisplay('P2Y')).toBe('2y');
    expect(formatDurationForDisplay('P10Y')).toBe('10y');
  });

  it('formats months correctly', () => {
    expect(formatDurationForDisplay('P1M')).toBe('1m');
    expect(formatDurationForDisplay('P3M')).toBe('3m');
    expect(formatDurationForDisplay('P6M')).toBe('6m');
  });

  it('formats weeks correctly', () => {
    expect(formatDurationForDisplay('P1W')).toBe('1w');
    expect(formatDurationForDisplay('P2W')).toBe('2w');
    expect(formatDurationForDisplay('P4W')).toBe('4w');
  });

  it('formats days correctly', () => {
    expect(formatDurationForDisplay('P1D')).toBe('1d');
    expect(formatDurationForDisplay('P3D')).toBe('3d');
    expect(formatDurationForDisplay('P7D')).toBe('7d');
  });

  it('handles complex durations by using the largest unit', () => {
    expect(formatDurationForDisplay('P1Y2M3W4D')).toBe('1y');
    expect(formatDurationForDisplay('P2M3W4D')).toBe('2m');
    expect(formatDurationForDisplay('P3W4D')).toBe('3w');
  });

  it('handles zero durations', () => {
    expect(formatDurationForDisplay('P0D')).toBe('0d');
  });

  it('handles invalid durations by returning 0d', () => {
    expect(formatDurationForDisplay('invalid')).toBe('0d');
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

  it('handles invalid durations by placing them at the end', () => {
    const durations = ['P1Y', 'invalid', 'P1D', 'P1M'];
    const sorted = sortDurationsByLength(durations);
    expect(sorted[0]).toBe('P1D');
    expect(sorted[sorted.length - 1]).toBe('invalid');
  });

  it('maintains stable sort for equal durations', () => {
    const durations = ['P1D', 'P1D', 'P1D'];
    const sorted = sortDurationsByLength(durations);
    expect(sorted).toEqual(['P1D', 'P1D', 'P1D']);
  });
});
