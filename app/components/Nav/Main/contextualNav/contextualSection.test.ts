import {
  enterCollectiblesSection,
  enterPerpsSection,
  enterPredictSection,
  enterRewardsSection,
  exitContextualSection,
  getContextualNavState,
  setContextualTab,
} from './contextualSection';

describe('contextualSection', () => {
  afterEach(() => {
    exitContextualSection();
  });

  it('starts on the default footer', () => {
    expect(getContextualNavState()).toEqual({
      section: null,
      tab: 'explore',
    });
  });

  it('enters Perps on Explore', () => {
    enterPerpsSection();

    expect(getContextualNavState()).toEqual({
      section: 'perps',
      tab: 'explore',
    });
  });

  it('enters Predictions on Explore', () => {
    enterPredictSection();

    expect(getContextualNavState()).toEqual({
      section: 'predict',
      tab: 'explore',
    });
  });

  it('enters Rewards on Earn', () => {
    enterRewardsSection();

    expect(getContextualNavState()).toEqual({
      section: 'rewards',
      tab: 'earn',
    });
  });

  it('enters Collectibles on Popular', () => {
    enterCollectiblesSection();

    expect(getContextualNavState()).toEqual({
      section: 'collectibles',
      tab: 'popular',
    });
  });

  it('switches the Perps tab and restores the default footer', () => {
    enterPerpsSection();
    setContextualTab('live');

    expect(getContextualNavState().tab).toBe('live');

    exitContextualSection();

    expect(getContextualNavState()).toEqual({
      section: null,
      tab: 'explore',
    });
  });
});
