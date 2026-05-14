import {
  getPredictWorldCupAvailableTabKeys,
  PREDICT_WORLD_CUP_TAB_KEYS,
  resolvePredictWorldCupInitialTab,
} from './worldCupTabs';

const config = {
  stages: [
    { key: 'group-stage', eventIds: ['123'] },
    { key: 'final', eventIds: ['456'] },
  ],
};

describe('worldCupTabs', () => {
  describe('getPredictWorldCupAvailableTabKeys', () => {
    it('returns all fixed and configured stage tabs when availability is not supplied', () => {
      expect(getPredictWorldCupAvailableTabKeys(config)).toEqual([
        PREDICT_WORLD_CUP_TAB_KEYS.ALL,
        PREDICT_WORLD_CUP_TAB_KEYS.LIVE,
        PREDICT_WORLD_CUP_TAB_KEYS.PROPS,
        'group-stage',
        'final',
      ]);
    });

    it('hides Live, Props, and stage tabs when availability is false', () => {
      expect(
        getPredictWorldCupAvailableTabKeys(config, {
          live: false,
          props: true,
          stages: {
            'group-stage': false,
            final: true,
          },
        }),
      ).toEqual([PREDICT_WORLD_CUP_TAB_KEYS.ALL, 'props', 'final']);
    });
  });

  describe('resolvePredictWorldCupInitialTab', () => {
    it('falls back to All when requested tab is hidden by availability', () => {
      expect(
        resolvePredictWorldCupInitialTab('group-stage', config, {
          live: true,
          props: true,
          stages: {
            'group-stage': false,
            final: true,
          },
        }),
      ).toBe(PREDICT_WORLD_CUP_TAB_KEYS.ALL);
    });
  });
});
