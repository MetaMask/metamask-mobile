// TAT-3974 reproduction marker — temporary, removed before the fix commit.
// Counts how often each instrumented site fires per 1s window so a runaway
// commit loop is visible in metro/app logs without a debugger attached.
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';

const windowCounts = new Map<string, number>();
let windowStartedAt = 0;

export function tat3974Mark(site: string): void {
  const now = Date.now();
  if (now - windowStartedAt >= 1000) {
    windowCounts.forEach((count, name) => {
      DevLogger.log(`[TAT-3974] BUG_MARKER: site=${name} perSecond=${count}`);
    });
    windowCounts.clear();
    windowStartedAt = now;
  }
  windowCounts.set(site, (windowCounts.get(site) ?? 0) + 1);
}
