import { RCTWidgetInfo } from '../NativeModules';
import Logger from '../../util/Logger';

// Duplicated rather than imported from `./getInstalledWidgets` — even a
// type-only import of the base path risks Metro treating it as a real
// dependency edge (see the platform-split note in that file / docs/widgets/README.md).
export interface InstalledWidget {
  kind: string;
  family: string;
}

/**
 * Calls the native `RCTWidgetInfo` module
 * (`ios/MetaMask/NativeModules/RCTWidgetInfo/`), a thin bridge over
 * WidgetKit's `WidgetCenter.getCurrentConfigurations` — `expo-widgets` does
 * not expose this itself (see that native module's header comment).
 *
 * Never throws: resolves `[]` on any native failure or if the module isn't
 * present (e.g. a stale binary from before this was added), since adoption
 * reporting should degrade silently rather than surface an error.
 */
export async function getInstalledWidgets(): Promise<InstalledWidget[]> {
  try {
    if (!RCTWidgetInfo) {
      return [];
    }
    const widgets = await RCTWidgetInfo.getInstalledWidgets();
    return widgets ?? [];
  } catch (error) {
    Logger.error(error as Error, 'getInstalledWidgets: native call failed');
    return [];
  }
}
