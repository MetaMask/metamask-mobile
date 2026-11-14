export interface ViewportRect {
  y: number;
  height: number;
}

export interface ViewportBounds {
  top: number;
  height: number;
}

export interface ViewportIntersectionOptions {
  /** Fraction of the smaller rect that must overlap. 0 accepts any positive overlap. */
  threshold?: number;
  /** Extra pixels above and below the viewport that still count as near. */
  rootMargin?: number;
}

export function visibleOverlapPx(
  rect: ViewportRect,
  viewport: ViewportBounds,
  rootMargin = 0,
): number {
  const viewportTop = viewport.top - rootMargin;
  const viewportBottom = viewport.top + viewport.height + rootMargin;
  return (
    Math.min(rect.y + rect.height, viewportBottom) -
    Math.max(rect.y, viewportTop)
  );
}

export function isInViewport(
  rect: ViewportRect,
  viewport: ViewportBounds,
  options?: ViewportIntersectionOptions,
): boolean {
  if (rect.height <= 0 || viewport.height <= 0) {
    return false;
  }

  const overlap = visibleOverlapPx(rect, viewport, options?.rootMargin ?? 0);
  if (overlap <= 0) {
    return false;
  }

  const required =
    Math.min(rect.height, viewport.height) * (options?.threshold ?? 0);
  return overlap >= required;
}
