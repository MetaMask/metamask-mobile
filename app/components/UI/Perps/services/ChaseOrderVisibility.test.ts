import {
  isChaseOrderHandleVisible,
  registerVisibleChaseOrderHandles,
  resetChaseOrderVisibilityForTests,
} from './ChaseOrderVisibility';

describe('ChaseOrderVisibility', () => {
  beforeEach(() => {
    resetChaseOrderVisibilityForTests();
  });

  afterEach(() => {
    resetChaseOrderVisibilityForTests();
  });

  it('removes visible handles when their registration cleans up', () => {
    const unregister = registerVisibleChaseOrderHandles(['chase-1']);
    expect(isChaseOrderHandleVisible('chase-1')).toBe(true);

    unregister();

    expect(isChaseOrderHandleVisible('chase-1')).toBe(false);
  });

  it('keeps a handle visible until every registration cleans up', () => {
    const unregisterFirst = registerVisibleChaseOrderHandles(['chase-1']);
    const unregisterSecond = registerVisibleChaseOrderHandles(['chase-1']);

    unregisterFirst();

    expect(isChaseOrderHandleVisible('chase-1')).toBe(true);
    unregisterSecond();
    expect(isChaseOrderHandleVisible('chase-1')).toBe(false);
  });
});
