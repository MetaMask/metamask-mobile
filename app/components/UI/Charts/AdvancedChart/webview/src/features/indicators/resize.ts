// Re-runs the widget's own resize after study operations so overlay lines
// re-align with the price scale. Ported from chartLogic.js
// `scheduleChartWidgetResize` (~line 162). Two rAFs + a 120ms timeout mirror
// the legacy staggered sequence — TradingView doesn't always align on the
// first tick after createStudy resolves.

import { getWidget } from '../../core/state';

export function scheduleChartWidgetResize(): void {
  const run = (): void => {
    const widget = getWidget();
    if (!widget) return;
    try {
      widget.resize();
    } catch {
      // TV can throw if the widget is mid-teardown; safe to ignore.
    }
  };
  try {
    requestAnimationFrame(() => {
      requestAnimationFrame(run);
    });
  } catch {
    setTimeout(run, 0);
  }
  setTimeout(run, 120);
}
