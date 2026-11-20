import { isInViewport, visibleOverlapPx } from './intersectsViewport';

describe('isInViewport', () => {
  const viewport = { top: 100, height: 800 };

  it('counts pixels shared by the element and the viewport', () => {
    expect(visibleOverlapPx({ y: 150, height: 200 }, viewport)).toBe(200);
  });

  it('returns true when the overlap meets the threshold', () => {
    expect(
      isInViewport({ y: 150, height: 200 }, viewport, { threshold: 0.2 }),
    ).toBe(true);
  });

  it('returns false when the element is fully outside the viewport', () => {
    expect(isInViewport({ y: 1200, height: 200 }, viewport)).toBe(false);
  });

  it('treats a near miss inside rootMargin as visible', () => {
    expect(
      isInViewport({ y: 1000, height: 100 }, viewport, { rootMargin: 200 }),
    ).toBe(true);
  });

  it('returns false when either rect has no height', () => {
    expect(isInViewport({ y: 150, height: 0 }, viewport)).toBe(false);
    expect(isInViewport({ y: 150, height: 200 }, { top: 0, height: 0 })).toBe(
      false,
    );
  });
});
