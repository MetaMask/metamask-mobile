import { getFloatingActionsScrollState } from './useFloatingActionsScrollHide';

describe('getFloatingActionsScrollState', () => {
  it.each([
    ['shows at the top', 0, 300, true, false, 0],
    ['hides on a scroll down past the top area', 300, 0, false, true, 300],
    ['stays shown on a scroll down near the top', 30, 0, false, false, 30],
    ['shows on a scroll up', 200, 300, true, false, 200],
    ['ignores movement under the threshold', 304, 300, true, true, 300],
  ])('%s', (_label, y, anchorY, isHidden, expectedHidden, expectedAnchor) => {
    expect(getFloatingActionsScrollState(y, anchorY, isHidden)).toEqual({
      isHidden: expectedHidden,
      anchorY: expectedAnchor,
    });
  });
});
