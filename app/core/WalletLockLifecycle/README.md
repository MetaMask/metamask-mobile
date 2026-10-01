# WalletLockLifecycle

Platform boolean for an in-session wallet lock. The lock path pushes
`LockScreen` (and `Login` with `{ locked: true }` when biometrics fail) over
the still-mounted product tree while this flag is `true`.

Always-on / singleton feature code (sockets, quote streams, chart WebViews,
connection managers) must gate connect and subscribe work on this flag.
`AppState` background alone is insufficient: the app stays `active` while
the lock covers are up. The navigation tree **stays mounted** (keep the exact
screen; no remount at lock). This flag is how always-on work pauses without
unmounting those screens. Feature teams wire it in follow-up PRs; this
platform slice ships **zero** production feature callers.

## API

```ts
import {
  setWalletLocked,
  getWalletLocked,
  selectIsWalletLocked,
} from '../../core/WalletLockLifecycle';
import { useSelector } from 'react-redux';

// Imperative (platform lock / unlock paths only)
setWalletLocked(true);
setWalletLocked(false);
getWalletLocked();

// React / always-on feature code
const locked = useSelector(selectIsWalletLocked);
if (locked) {
  // do not start expensive work
}
```

There is **no** `subscribeWalletLockLifecycle` / `onLocked` / `onUnlocked`
callback API in V1.

## When the flag flips

- **`true`** — on the in-session lock path (`prepareWalletLockOverlay`),
  before the saga pushes `LockScreen`. `lockedAt` is stamped earlier, when
  the app enters `background` (`LockManagerService`); lock prep keeps that
  stamp so a lock that lands late on resume does not restart the restore
  window. The tree stays mounted under the covers. When route restore is
  enabled, `restoreWindowExpiry` arms a timer; if it elapses while the app
  is foregrounded and still locked, the tree is `reset` to `HomeNav` behind
  the covers (once per session). On resume after the window there is no
  reset: unlock resets under the covers and waits for interactions to settle
  before clearing the flag.
- **`false`** — after a successful unlock navigation decision
  (`popTo(HomeNav)`, Home `reset`, or handled startup deeplink), and on
  logout so a wiped session does not stay flagged.

Cold start and logout keep `Login` as `Routes.ONBOARDING.LOGIN` when there
is no session tree; the flag stays `false` there unless an in-session lock
is in progress.

## Covers

| State                                 | Navigation                                               |
| ------------------------------------- | -------------------------------------------------------- |
| not locked                            | no lock cover                                            |
| in-session lock                       | `LockScreen` pushed; `Login` pushed on biometric failure |
| unlock inside window, restorable path | `popTo(HomeNav)` (covers pop; exact screen stays)        |
| unlock otherwise                      | Home `reset`                                             |

Forgot password from the Login cover uses `ROOT_MODAL_FLOW` (sheet over
Login). A root privacy Modal curtain is deferred.

## Keep-alive vs boolean

At lock the tree stays mounted, including nested details. Remount is not used.
Always-on sockets, charts, and WebViews must gate on this boolean or they keep
running under the lock covers. Feature-team adoption is out of this PR.

## Ownership

Feature teams own pause/resume correctness. This module does **not** provide
nested navigation snapshots, route params, or disk persistence across process
death. Zero production feature-team callers ship in the V1 platform PR;
adopters (e.g. Perps) wire in follow-up PRs.
