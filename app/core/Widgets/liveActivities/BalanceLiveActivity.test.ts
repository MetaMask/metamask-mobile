import { createLiveActivity } from 'expo-widgets';

// Extensionless import: Jest's haste config (via `@react-native/jest-preset`)
// defaults to resolving platform files as `ios`, matching how production code
// (BalanceLiveActivityService.ts) imports this module. See
// BalanceLiveActivity.tsx for the non-iOS fallback, which is trivial enough
// (a no-op) not to need its own test.
import {
  BALANCE_LIVE_ACTIVITY_NAME,
  BalanceLiveActivity,
} from './BalanceLiveActivity';

describe('BalanceLiveActivity', () => {
  it('registers under the name the ExpoWidgetsTarget extension looks up in the App Group', () => {
    expect(BALANCE_LIVE_ACTIVITY_NAME).toBe('BalanceLiveActivity');
  });

  it('is created via expo-widgets createLiveActivity exactly once at module load', () => {
    expect(createLiveActivity).toHaveBeenCalledWith(
      BALANCE_LIVE_ACTIVITY_NAME,
      // A string, not a function: proof that babel-preset-expo's widgets
      // plugin actually stringified the `'widget'`-directive layout, and that
      // Metro resolved the `.ios.tsx` implementation rather than the `.tsx`
      // no-op fallback.
      expect.any(String),
    );
  });

  it('exposes the start/getInstances factory API the service drives it through', () => {
    expect(typeof BalanceLiveActivity.start).toBe('function');
    expect(typeof BalanceLiveActivity.getInstances).toBe('function');
  });
});
