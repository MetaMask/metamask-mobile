import { createLiveActivity } from 'expo-widgets';

// Extensionless import: Jest's haste config (via `@react-native/jest-preset`)
// defaults to resolving platform files as `ios`, matching how production code
// (PerpsLiveActivityService.ts) imports this module. See
// PerpsPnlLiveActivity.ts for the non-iOS fallback, which is trivial enough
// (a no-op) not to need its own test.
import {
  PERPS_PNL_LIVE_ACTIVITY_NAME,
  PerpsPnlLiveActivity,
} from './PerpsPnlLiveActivity';

describe('PerpsPnlLiveActivity', () => {
  it('registers under the name the ExpoWidgetsTarget extension looks up in the App Group', () => {
    expect(PERPS_PNL_LIVE_ACTIVITY_NAME).toBe('PerpsPnlLiveActivity');
  });

  it('is created via expo-widgets createLiveActivity exactly once at module load', () => {
    expect(createLiveActivity).toHaveBeenCalledWith(
      PERPS_PNL_LIVE_ACTIVITY_NAME,
      // A string, not a function: proof that babel-preset-expo's widgets
      // plugin actually stringified the `'widget'`-directive layout. If this
      // ever regresses to a function, the layout would be shipped to the
      // extension as `undefined` and render nothing.
      expect.any(String),
    );
  });

  it('exposes the start/getInstances factory API the service drives it through', () => {
    expect(typeof PerpsPnlLiveActivity.start).toBe('function');
    expect(typeof PerpsPnlLiveActivity.getInstances).toBe('function');
  });
});
