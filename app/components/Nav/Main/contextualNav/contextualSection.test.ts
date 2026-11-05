import {
  enterCollectiblesSection,
  enterExploreSection,
  enterMoneySection,
  enterPerpsSection,
  enterPredictSection,
  enterRewardsSection,
  enterTradeDashboard,
  enterTradeExplore,
  enterTradingHub,
  exitContextualSection,
  getContextualCircleAction,
  getContextualNavState,
  isTradingHub,
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

  it('enters Money on Account', () => {
    enterMoneySection();

    expect(getContextualNavState()).toEqual({
      section: 'money',
      tab: 'account',
    });
  });

  it('enters Explore on Explore', () => {
    enterExploreSection();

    expect(getContextualNavState()).toEqual({
      section: 'explore',
      tab: 'explore',
    });
  });

  it('chooses the circle from the section', () => {
    expect(getContextualCircleAction(null)).toBe('add');
    expect(getContextualCircleAction('perps')).toBe('home');
    expect(getContextualCircleAction('predict')).toBe('home');
    expect(getContextualCircleAction('rewards')).toBe('home');
    expect(getContextualCircleAction('collectibles')).toBe('home');

    enterMoneySection();

    expect(getContextualCircleAction(getContextualNavState().section)).toBe(
      'home',
    );

    enterExploreSection();

    expect(getContextualCircleAction(getContextualNavState().section)).toBe(
      'home',
    );
  });

  it('opens Trade on Explore and does not reset an open hub', () => {
    enterTradeDashboard();

    expect(getContextualNavState()).toEqual({
      section: 'trading',
      tab: 'explore',
    });

    enterTradingHub('swap');
    enterTradeDashboard();

    expect(getContextualNavState().tab).toBe('swap');

    enterTradeExplore();

    expect(getContextualNavState()).toEqual({
      section: 'trading',
      tab: 'explore',
    });
  });

  it('enters a trading hub on the selected way to trade', () => {
    enterTradingHub('perps');

    expect(getContextualNavState()).toEqual({
      section: 'trading',
      tab: 'perps',
    });
    expect(isTradingHub(getContextualNavState(), 'perps')).toBe(true);
    expect(isTradingHub(getContextualNavState(), 'swap')).toBe(false);

    enterTradingHub('perps');

    expect(getContextualNavState().tab).toBe('perps');

    enterTradingHub('predictions');

    expect(getContextualNavState()).toEqual({
      section: 'trading',
      tab: 'predictions',
    });
  });

  it('switches the Money tab and restores the default footer', () => {
    enterMoneySection();
    setContextualTab('payments');

    expect(getContextualNavState().tab).toBe('payments');

    exitContextualSection();

    expect(getContextualNavState()).toEqual({
      section: null,
      tab: 'explore',
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
