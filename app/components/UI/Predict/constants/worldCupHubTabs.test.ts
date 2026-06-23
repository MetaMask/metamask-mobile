import {
  buildPredictWorldCupHubTabs,
  PREDICT_WORLD_CUP_HUB_DEFAULT_TAB,
  PREDICT_WORLD_CUP_HUB_TAB_KEYS,
} from './worldCupHubTabs';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('worldCupHubTabs', () => {
  describe('PREDICT_WORLD_CUP_HUB_TAB_KEYS', () => {
    it('exposes GAMES and PROPS tab keys', () => {
      expect(PREDICT_WORLD_CUP_HUB_TAB_KEYS.GAMES).toBe('games');
      expect(PREDICT_WORLD_CUP_HUB_TAB_KEYS.PROPS).toBe('props');
    });
  });

  describe('PREDICT_WORLD_CUP_HUB_DEFAULT_TAB', () => {
    it('defaults to the games tab', () => {
      expect(PREDICT_WORLD_CUP_HUB_DEFAULT_TAB).toBe(
        PREDICT_WORLD_CUP_HUB_TAB_KEYS.GAMES,
      );
    });
  });

  describe('buildPredictWorldCupHubTabs', () => {
    it('returns Games and Props tabs in order', () => {
      const tabs = buildPredictWorldCupHubTabs(false);

      expect(tabs).toHaveLength(2);
      expect(tabs[0].key).toBe(PREDICT_WORLD_CUP_HUB_TAB_KEYS.GAMES);
      expect(tabs[1].key).toBe(PREDICT_WORLD_CUP_HUB_TAB_KEYS.PROPS);
    });

    it('sets hasLiveDot on Games tab when isLive is true', () => {
      const tabs = buildPredictWorldCupHubTabs(true);

      expect(tabs[0].hasLiveDot).toBe(true);
    });

    it('omits hasLiveDot on Games tab when isLive is false', () => {
      const tabs = buildPredictWorldCupHubTabs(false);

      expect(tabs[0].hasLiveDot).toBe(false);
    });

    it('never sets hasLiveDot on Props tab regardless of live status', () => {
      const tabsLive = buildPredictWorldCupHubTabs(true);
      const tabsNotLive = buildPredictWorldCupHubTabs(false);

      expect(tabsLive[1].hasLiveDot).toBeFalsy();
      expect(tabsNotLive[1].hasLiveDot).toBeFalsy();
    });
  });
});
