/**
 * Launch-time cleanup for Live Activities that outlived the process that
 * started them.
 *
 * iOS deliberately keeps a Live Activity on the Lock Screen after its host
 * app is terminated (that's how a rideshare ETA survives a force-quit), but
 * the JS `LiveActivity` handle needed to `update()`/`end()` it does not
 * survive. Without this, force-quitting the app while an activity is running
 * leaves a frozen, un-endable card on the Lock Screen until the OS expires it
 * hours later.
 *
 * WHY THIS IS APP-WIDE RATHER THAN PER-FEATURE: `expo-widgets` renders every
 * Live Activity through a single shared `ActivityAttributes` type
 * (`LiveActivityAttributes` in node_modules/expo-widgets/ios/Widgets/WidgetLiveActivity.swift),
 * discriminating between kinds only by a `name` field inside the content
 * state. `getInstances()` therefore returns EVERY live instance regardless of
 * which factory started it, and `LiveActivity.update()` rewrites that `name`
 * from the factory it was obtained through — so a feature that "adopted"
 * `getInstances()[0]` could silently repurpose an unrelated feature's
 * activity.
 *
 * Two consequences follow, both enforced here. Orphan cleanup must be
 * indiscriminate ("end everything"), so it may only run at launch, before any
 * feature has started an activity of its own. And it must run at most once per
 * process, or the second caller would end the first caller's freshly started
 * activity.
 *
 * Platform-agnostic on purpose: it never imports `expo-widgets`, it only
 * accepts anything structurally shaped like a factory. On Android the
 * no-op fallback factory reports zero instances, so this is a cheap no-op.
 */

interface EndableLiveActivity {
  end(dismissalPolicy?: unknown): Promise<void>;
}

interface LiveActivityInstanceSource {
  getInstances(): EndableLiveActivity[];
}

let hasReconciled = false;

/**
 * Ends every Live Activity still running from a previous app launch. Safe to
 * call from more than one feature — only the first call in a process does
 * anything.
 *
 * @param source Any registered Live Activity factory. Which one is irrelevant
 * (see the module comment) — `getInstances()` is app-wide.
 */
export async function endLiveActivitiesFromPreviousLaunch(
  source: LiveActivityInstanceSource,
): Promise<void> {
  if (hasReconciled) {
    return;
  }
  hasReconciled = true;

  await Promise.all(
    source
      .getInstances()
      .map((instance) => instance.end('immediate').catch(() => undefined)),
  );
}

/**
 * Test-only escape hatch for the once-per-process guard above. Production code
 * must never call this — doing so would let a second caller end an activity
 * that is currently being driven.
 */
export function resetLiveActivityReconciliationForTests(): void {
  hasReconciled = false;
}
