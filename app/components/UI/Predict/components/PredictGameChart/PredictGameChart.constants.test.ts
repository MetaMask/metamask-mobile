import {
  getSeparatedLabelYPositions,
  getChartRightInset,
  CHART_HEIGHT,
  LABEL_HEIGHT,
  MIN_LABEL_GAP,
  MIN_LABEL_Y,
  MAX_LABEL_Y,
  CHART_INSET_RIGHT_MIN,
  CHART_INSET_RIGHT_MAX,
} from './PredictGameChart.constants';

describe('getSeparatedLabelYPositions', () => {
  const minSpacing = LABEL_HEIGHT + MIN_LABEL_GAP; // 48

  describe('empty array', () => {
    it('returns empty array', () => {
      const result = getSeparatedLabelYPositions([]);

      expect(result).toEqual([]);
    });
  });

  describe('single position', () => {
    it('returns its dotY', () => {
      const input = [{ dotY: 100 }];

      const result = getSeparatedLabelYPositions(input);

      expect(result).toEqual([100]);
    });
  });

  describe('two positions with sufficient gap', () => {
    it('returns original positions unchanged', () => {
      const input = [{ dotY: 50 }, { dotY: 120 }];

      const result = getSeparatedLabelYPositions(input);

      expect(result).toEqual([50, 120]);
    });
  });

  describe('two positions with insufficient gap, first above second', () => {
    it('applies symmetric centering', () => {
      const input = [{ dotY: 50 }, { dotY: 80 }];

      const result = getSeparatedLabelYPositions(input);

      const midPoint = (50 + 80) / 2; // 65
      const offset = minSpacing / 2; // 24
      expect(result).toEqual([midPoint - offset, midPoint + offset]);
      expect(result).toEqual([41, 89]);
    });
  });

  describe('two positions with insufficient gap, first below second', () => {
    it('applies symmetric centering reversed', () => {
      const input = [{ dotY: 100 }, { dotY: 120 }];

      const result = getSeparatedLabelYPositions(input);

      const midPoint = (100 + 120) / 2; // 110
      const offset = minSpacing / 2; // 24
      expect(result).toEqual([midPoint - offset, midPoint + offset]);
      expect(result).toEqual([86, 134]);
    });
  });

  describe('three positions with no overlap but bottom overflow', () => {
    it('anchors the bottom and keeps everything within the chart', () => {
      const input = [{ dotY: 20 }, { dotY: 100 }, { dotY: 180 }];

      const result = getSeparatedLabelYPositions(input);

      // After spacing: [20, 100, 180] (no gaps < minSpacing)
      // Bottom (180) overflows MAX_LABEL_Y (160) -> anchor bottom at 160 and
      // push the rest up only where the gap is violated: [20, 100, 160].
      // Top (20) is above the top edge -> pin it at MIN_LABEL_Y: [22, 100, 160]
      expect(result).toEqual([22, 100, 160]);
      expect(Math.min(...result)).toBeGreaterThanOrEqual(MIN_LABEL_Y);
      expect(Math.max(...result)).toBeLessThanOrEqual(MAX_LABEL_Y);
    });
  });

  describe('three positions that overlap', () => {
    it('pushes down correctly', () => {
      const input = [{ dotY: 50 }, { dotY: 60 }, { dotY: 70 }];

      const result = getSeparatedLabelYPositions(input);

      // First stays at 50
      // Second pushed to 50 + 48 = 98
      // Third pushed to 98 + 48 = 146
      expect(result).toEqual([50, 98, 146]);
    });
  });

  describe('three positions near bottom of chart', () => {
    it('shifted upward so nothing exceeds CHART_HEIGHT - LABEL_HEIGHT', () => {
      const input = [{ dotY: 140 }, { dotY: 150 }, { dotY: 160 }];

      const result = getSeparatedLabelYPositions(input);

      // After sorting: [140, 150, 160]
      // After spacing: [140, 188, 236]
      // maxY = 200 - 40 = 160
      // overflow = 236 - 160 = 76
      // Shift all up by 76: [64, 112, 160]
      expect(result).toEqual([64, 112, 160]);
    });
  });

  describe('three positions clustered near the top edge', () => {
    it('shifts the stack down so the top label is not clipped', () => {
      const input = [{ dotY: 10 }, { dotY: 20 }, { dotY: 30 }];

      const result = getSeparatedLabelYPositions(input);

      // After sorting: [10, 20, 30]
      // After spacing: [10, 58, 106] (no bottom overflow)
      // Top (10) sits above the top edge, so the stack is pushed down until the
      // top label rests at MIN_LABEL_Y (22): [22, 70, 118]
      expect(result).toEqual([22, 70, 118]);
      expect(Math.min(...result)).toBeGreaterThanOrEqual(MIN_LABEL_Y);
    });
  });

  describe('three positions with extreme overflow', () => {
    it('shifts up fully when the top stays above MIN_LABEL_Y', () => {
      const input = [{ dotY: 150 }, { dotY: 160 }, { dotY: 170 }];

      const result = getSeparatedLabelYPositions(input);

      // After sorting: [150, 160, 170]
      // After spacing: [150, 198, 246]
      // maxY = 160
      // overflow = 246 - 160 = 86
      // Shift all up by 86: [64, 112, 160]
      // Top (64) stays above MIN_LABEL_Y (22), so the shift is not capped
      expect(result).toEqual([64, 112, 160]);
    });
  });

  describe('preserves original order in result array', () => {
    it('maps positions back to original indices', () => {
      const input = [{ dotY: 100 }, { dotY: 50 }, { dotY: 150 }];

      const result = getSeparatedLabelYPositions(input);

      // Input order: [100, 50, 150]
      // Sorted internally: [50, 100, 150] with indices [1, 0, 2]
      // After spacing: [50, 98, 146]
      // maxY = 160, overflow = 146 - 160 = -14 (no overflow)
      // Result maps back to original order: result[0]=100, result[1]=50, result[2]=150
      expect(result[0]).toBe(100); // original first (100) stays 100
      expect(result[1]).toBe(50); // original second (50) stays 50
      expect(result[2]).toBe(150); // original third (150) stays 150
    });
  });

  describe('edge case: all positions at same Y', () => {
    it('spreads them with minSpacing', () => {
      const input = [{ dotY: 100 }, { dotY: 100 }, { dotY: 100 }];

      const result = getSeparatedLabelYPositions(input);

      // After sorting: [100, 100, 100]
      // After spacing: [100, 148, 196]
      // maxY = 160, overflow = 196 - 160 = 36
      // Shift all up by 36: [64, 112, 160]
      expect(result).toEqual([64, 112, 160]);
    });
  });

  describe('edge case: two positions at exact minSpacing boundary', () => {
    it('returns original positions when gap equals minSpacing', () => {
      const input = [{ dotY: 50 }, { dotY: 98 }];

      const result = getSeparatedLabelYPositions(input);

      expect(result).toEqual([50, 98]);
    });
  });

  describe('three positions with no overflow', () => {
    it('does not shift when all fit within bounds', () => {
      const input = [{ dotY: 30 }, { dotY: 80 }, { dotY: 150 }];

      const result = getSeparatedLabelYPositions(input);

      // After sorting: [30, 80, 150]
      // After spacing: [30, 80, 150] (gaps are 50 and 70, both >= 48)
      // Top (30) >= MIN_LABEL_Y and bottom (150) <= maxY (160): no shift applied
      expect(result).toEqual([30, 80, 150]);
    });
  });

  describe('three positions where the stack overflows the bottom edge', () => {
    it('anchors the bottom at MAX_LABEL_Y while preserving spacing', () => {
      const input = [{ dotY: 30 }, { dotY: 100 }, { dotY: 170 }];

      const result = getSeparatedLabelYPositions(input);

      // After spacing: [30, 100, 170] (gaps are 70 and 70, both >= 48)
      // Bottom (170) overflows MAX_LABEL_Y (160) -> anchor bottom at 160 and
      // push the middle up only where needed: [30, 100, 160]. The top stays at
      // its dot since it is already above MIN_LABEL_Y.
      expect(result).toEqual([30, 100, 160]);
      expect(Math.min(...result)).toBeGreaterThanOrEqual(MIN_LABEL_Y);
      expect(Math.max(...result)).toBeLessThanOrEqual(MAX_LABEL_Y);
      expect(result[1] - result[0]).toBeGreaterThanOrEqual(minSpacing);
      expect(result[2] - result[1]).toBeGreaterThanOrEqual(minSpacing);
    });
  });

  describe('four positions with mixed gaps', () => {
    it('handles both sufficient and insufficient gaps', () => {
      const input = [{ dotY: 20 }, { dotY: 30 }, { dotY: 100 }, { dotY: 150 }];

      const result = getSeparatedLabelYPositions(input);

      // After sorting: [20, 30, 100, 150]
      // Gap 1: 30 - 20 = 10 < 48, push to 20 + 48 = 68
      // Gap 2: 100 - 68 = 32 < 48, push to 68 + 48 = 116
      // Gap 3: 150 - 116 = 34 < 48, push to 116 + 48 = 164
      // After spacing: [20, 68, 116, 164]
      // Bottom (164) overflows maxY (160); pulling up by 4 would push the top
      // label below MIN_LABEL_Y, so the top is pinned at 22: [22, 70, 118, 166]
      expect(result).toEqual([22, 70, 118, 166]);
      expect(Math.min(...result)).toBeGreaterThanOrEqual(MIN_LABEL_Y);
    });
  });

  describe('labels never clip against either edge (PRED-955)', () => {
    it('keeps a high top value visible when lower values are clustered', () => {
      // Mirrors 70% / 21% / 11%: the leading outcome sits near the top while
      // the trailing outcomes are bunched near the bottom.
      const input = [{ dotY: 42 }, { dotY: 146 }, { dotY: 167 }];

      const result = getSeparatedLabelYPositions(input);

      // After spacing: [42, 146, 194] (bottom pushed down to keep min gap)
      // Bottom overflows -> anchor at 160 and push the middle up: [42, 112, 160]
      expect(result).toEqual([42, 112, 160]);
      expect(Math.min(...result)).toBeGreaterThanOrEqual(MIN_LABEL_Y);
      expect(Math.max(...result)).toBeLessThanOrEqual(MAX_LABEL_Y);
    });

    it('keeps the lowest value visible when two outcomes are clustered near the floor', () => {
      // Mirrors 91% / 6% / 3%: the leading outcome sits near the top while the
      // two trailing outcomes overlap near the bottom edge, where the lowest
      // value text was being cut off.
      const input = [{ dotY: 43 }, { dotY: 171 }, { dotY: 175 }];

      const result = getSeparatedLabelYPositions(input);

      // After spacing: [43, 171, 219] (lowest pushed down past the floor)
      // Anchor the bottom at MAX_LABEL_Y (160) and push the middle up so the
      // lowest value text stays on screen: [43, 112, 160]
      expect(result).toEqual([43, 112, 160]);
      expect(Math.max(...result)).toBeLessThanOrEqual(MAX_LABEL_Y);
      expect(Math.min(...result)).toBeGreaterThanOrEqual(MIN_LABEL_Y);
    });

    it('keeps the top of two clustered labels above MIN_LABEL_Y near the top edge', () => {
      const input = [{ dotY: 30 }, { dotY: 34 }];

      const result = getSeparatedLabelYPositions(input);

      // Centering would place the top label at 8 and clip its text; the pair is
      // shifted down so the top label sits at MIN_LABEL_Y (22): [22, 70]
      expect(result).toEqual([22, 70]);
      expect(Math.min(...result)).toBeGreaterThanOrEqual(MIN_LABEL_Y);
    });

    it('keeps the bottom of two clustered labels above the floor near the bottom edge', () => {
      const input = [{ dotY: 171 }, { dotY: 175 }];

      const result = getSeparatedLabelYPositions(input);

      // Centering would place the bottom label at ~197 and clip its value; the
      // pair is shifted up so the bottom label sits at MAX_LABEL_Y (160)
      expect(result).toEqual([112, 160]);
      expect(Math.max(...result)).toBeLessThanOrEqual(MAX_LABEL_Y);
      expect(Math.min(...result)).toBeGreaterThanOrEqual(MIN_LABEL_Y);
    });
  });
});

describe('getChartRightInset', () => {
  it('returns the minimum inset for short labels and 2-digit values', () => {
    expect(getChartRightInset(['MEX', 'RSA'], 70)).toBe(CHART_INSET_RIGHT_MIN);
  });

  it('returns the minimum inset when there are no labels', () => {
    expect(getChartRightInset([], 0)).toBe(CHART_INSET_RIGHT_MIN);
  });

  it('reserves more room for long team labels so the name is not clipped', () => {
    const longLabelInset = getChartRightInset(['UDVARDY'], 33);

    expect(longLabelInset).toBeGreaterThan(getChartRightInset(['MEX'], 33));
    expect(longLabelInset).toBeGreaterThan(CHART_INSET_RIGHT_MIN);
  });

  it('reserves more room when a value reaches 100% (three digits)', () => {
    expect(getChartRightInset(['A', 'B'], 100)).toBeGreaterThan(
      getChartRightInset(['A', 'B'], 70),
    );
  });

  it('treats values that round up to 100 as three digits', () => {
    expect(getChartRightInset(['A'], 99.6)).toBe(
      getChartRightInset(['A'], 100),
    );
    expect(getChartRightInset(['A'], 99.4)).toBe(getChartRightInset(['A'], 99));
  });

  it('clamps a very long label to the maximum inset', () => {
    expect(getChartRightInset(['SUPERLONGTEAMNAME'], 50)).toBe(
      CHART_INSET_RIGHT_MAX,
    );
  });
});
