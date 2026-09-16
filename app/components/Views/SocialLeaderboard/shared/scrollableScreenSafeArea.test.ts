import { SCROLLABLE_SCREEN_SAFE_AREA_EDGES } from './scrollableScreenSafeArea';

describe('SCROLLABLE_SCREEN_SAFE_AREA_EDGES', () => {
  it('excludes top and bottom edges so scroll content extends edge to edge', () => {
    expect(SCROLLABLE_SCREEN_SAFE_AREA_EDGES).toEqual(['left', 'right']);
    expect(SCROLLABLE_SCREEN_SAFE_AREA_EDGES).not.toContain('top');
    expect(SCROLLABLE_SCREEN_SAFE_AREA_EDGES).not.toContain('bottom');
  });
});
