import {
  isChaseOrderSymbolVisible,
  registerVisibleChaseOrderSymbols,
  resetChaseOrderVisibilityForTests,
} from './ChaseOrderVisibility';

describe('ChaseOrderVisibility', () => {
  beforeEach(() => {
    resetChaseOrderVisibilityForTests();
  });

  afterEach(() => {
    resetChaseOrderVisibilityForTests();
  });

  it('removes visible symbols when their registration cleans up', () => {
    const unregister = registerVisibleChaseOrderSymbols(['ETH']);
    expect(isChaseOrderSymbolVisible('ETH')).toBe(true);

    unregister();

    expect(isChaseOrderSymbolVisible('ETH')).toBe(false);
  });

  it('keeps a symbol visible until every registration cleans up', () => {
    const unregisterFirst = registerVisibleChaseOrderSymbols(['ETH']);
    const unregisterSecond = registerVisibleChaseOrderSymbols(['ETH']);

    unregisterFirst();

    expect(isChaseOrderSymbolVisible('ETH')).toBe(true);
    unregisterSecond();
    expect(isChaseOrderSymbolVisible('ETH')).toBe(false);
  });
});
