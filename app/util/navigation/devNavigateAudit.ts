import { Alert } from 'react-native';
import type {
  NavigationAction,
  NavigationContainerRef,
} from '@react-navigation/native';

/**
 * TEMPORARY — delete before the React Navigation v7 PR merges.
 *
 * v7 changed what `navigate(name)` does when the target screen is not focused:
 * v6 popped back to the existing instance, v7 pushes a new one. The subset of
 * the ~859 `navigate` call sites that relied on the v6 behaviour cannot be
 * found statically, because resolution depends on the runtime tree. This
 * listener finds them by watching real navigations and reporting the two ways
 * the change shows up:
 *
 * Duplicated: the navigate left two copies of the target screen in one stack, so
 * the user sees a duplicate and back needs an extra press.
 *
 * No-op: the target lives in a navigator that did not react, so the app silently
 * ignored the request.
 *
 * Either report means that call site needs `navigate(name, params, { pop: true })`,
 * which is the v8-compatible way to ask for v6's behaviour.
 *
 * Reports surface as an alert so they cannot be missed mid-flow, and as a console
 * warning for easier copying. Each unique call site alerts once per session.
 */

// Structural shapes: navigation state is recursive and its generics fight
// narrowing, while all this needs is route names and nesting.
interface RouteLike {
  name: string;
  state?: StateLike;
}

interface StateLike {
  type?: string;
  routes: RouteLike[];
}

const LOG_PREFIX = '[nav-v7-audit]';

const getTargetName = (action: NavigationAction): string | undefined => {
  if (action.type !== 'NAVIGATE' || !action.payload) {
    return undefined;
  }
  // The NAVIGATE payload is keyed either by `name` or by an existing route
  // `key`; only the `name` form can duplicate a screen.
  const name = 'name' in action.payload ? action.payload.name : undefined;

  return typeof name === 'string' ? name : undefined;
};

/**
 * Paths of every stack navigator holding `name` more than once, e.g.
 * `root > HomeTabs (3x WalletTabHome)`.
 */
const findDuplicateStacks = (
  state: StateLike,
  name: string,
  path: string[] = ['root'],
): string[] => {
  const found: string[] = [];
  const copies = state.routes.filter((route) => route.name === name).length;

  // Only stacks can hold duplicates; tab and drawer navigators keep one route
  // per screen by construction.
  if (state.type === 'stack' && copies > 1) {
    found.push(`${path.join(' > ')} (${copies}x ${name})`);
  }

  for (const route of state.routes) {
    if (route.state) {
      found.push(
        ...findDuplicateStacks(route.state, name, [...path, route.name]),
      );
    }
  }

  return found;
};

/**
 * The frames that identify the caller, with React Navigation's own internals
 * and the bundler's noise dropped.
 */
const callSiteFrames = (stack: string | undefined): string => {
  if (!stack) {
    return 'no stack trace available';
  }

  return stack
    .split('\n')
    .filter(
      (frame) =>
        frame.includes('app/') &&
        !frame.includes('node_modules') &&
        !frame.includes('devNavigateAudit'),
    )
    .slice(0, 4)
    .join('\n');
};

// One alert per unique call site, otherwise a screen that navigates on every
// render would bury the device in modals.
const alreadyReported = new Set<string>();

/**
 * Clears the per-session dedupe. Tests only.
 */
export function resetNavigateAuditReports() {
  alreadyReported.clear();
}

const report = (
  summary: string,
  detail: string,
  stack: string | undefined,
): void => {
  const frames = callSiteFrames(stack);

  console.warn(`${LOG_PREFIX} ${summary}\n${detail}\n${frames}`);

  const fingerprint = `${summary}|${frames}`;

  if (alreadyReported.has(fingerprint)) {
    return;
  }

  alreadyReported.add(fingerprint);

  Alert.alert(`${LOG_PREFIX} ${summary}`, `${detail}\n\n${frames}`, [
    { text: 'OK' },
  ]);
};

/**
 * Watches dispatched navigate actions and reports the ones whose behaviour
 * differs between v6 and v7. Returns an unsubscribe function.
 *
 * Attach to the raw container ref, not to `NavigationService.navigation`, which
 * is a wrapper that defers method calls.
 */
export function attachNavigateAudit<ParamList extends object>(
  navigationRef: NavigationContainerRef<ParamList>,
): () => void {
  return navigationRef.addListener('__unsafe_action__', ({ data }) => {
    const { action, noop, stack } = data;
    const name = getTargetName(action);

    if (!name) {
      return;
    }

    if (noop) {
      // Navigating to the screen you are already on is a no-op on v6 too, so it
      // is not a v7 difference.
      if (navigationRef.getCurrentRoute()?.name === name) {
        return;
      }

      report(
        `navigate('${name}') did nothing`,
        'On v6 this went back to the existing screen. Needs { pop: true }.',
        stack,
      );
      return;
    }

    // The action event fires before the new state is applied, so look at the
    // result on the next tick.
    setTimeout(() => {
      const duplicates = findDuplicateStacks(
        navigationRef.getRootState(),
        name,
      );

      if (duplicates.length > 0) {
        report(
          `navigate('${name}') duplicated the screen`,
          `On v6 this went back to the existing one. Needs { pop: true }.\n${duplicates.join(
            '\n',
          )}`,
          stack,
        );
      }
    }, 0);
  });
}
