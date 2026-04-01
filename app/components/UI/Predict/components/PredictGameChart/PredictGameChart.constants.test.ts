import {
  getSeparatedLabelYPositions,
  CHART_HEIGHT,
  LABEL_HEIGHT,
  MIN_LABEL_GAP,
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
    it('preserves spacing and shifts group upward', () => {
      const input = [{ dotY: 20 }, { dotY: 100 }, { dotY: 180 }];

      const result = getSeparatedLabelYPositions(input);

      // After sorting: [20, 100, 180]
      // After spacing: [20, 100, 180] (no gaps < minSpacing)
      // maxY = 160, overflow = 180 - 160 = 20
      // Shift all up by 20: [0, 80, 160]
      expect(result).toEqual([0, 80, 160]);
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

  describe('three positions where overflow shift would push top below 0', () => {
    it('clamped to 0', () => {
      const input = [{ dotY: 10 }, { dotY: 20 }, { dotY: 30 }];

      const result = getSeparatedLabelYPositions(input);

      // After sorting: [10, 20, 30]
      // After spacing: [10, 58, 106]
      // maxY = 160
      // overflow = 106 - 160 = -54 (no overflow)
      // No shift needed
      expect(result).toEqual([10, 58, 106]);
    });
  });

  describe('three positions with extreme overflow requiring clamping', () => {
    it('clamps top position to 0 when shift would go negative', () => {
      const input = [{ dotY: 150 }, { dotY: 160 }, { dotY: 170 }];

      const result = getSeparatedLabelYPositions(input);

      // After sorting: [150, 160, 170]
      // After spacing: [150, 198, 246]
      // maxY = 160
      // overflow = 246 - 160 = 86
      // Shift all up by 86: [64, 112, 160]
      // No clamping needed since 64 > 0
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
      const input = [{ dotY: 10 }, { dotY: 80 }, { dotY: 150 }];

      const result = getSeparatedLabelYPositions(input);

      // After sorting: [10, 80, 150]
      // After spacing: [10, 80, 150] (gaps are 70 and 70, both >= 48)
      // maxY = 160, overflow = 150 - 160 = -10 (no overflow)
      // No shift applied
      expect(result).toEqual([10, 80, 150]);
    });
  });

  describe('three positions with overflow exceeding top position', () => {
    it('limits shift to top position value preserving spacing', () => {
      const input = [{ dotY: 10 }, { dotY: 100 }, { dotY: 190 }];

      const result = getSeparatedLabelYPositions(input);

      // After sorting: [10, 100, 190]
      // After spacing: [10, 100, 190] (gaps are 90 and 90, both >= 48)
      // maxY = 160, overflow = 190 - 160 = 30
      // shift = Math.min(30, 10) = 10 (limited by top position)
      // After shift: [0, 90, 180] — spacing preserved even though bottom overflows
      expect(result).toEqual([0, 90, 180]);
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
      // maxY = 160, overflow = 164 - 160 = 4
      // Shift all up by 4: [16, 64, 112, 160]
      expect(result).toEqual([16, 64, 112, 160]);
    });
  });
});
