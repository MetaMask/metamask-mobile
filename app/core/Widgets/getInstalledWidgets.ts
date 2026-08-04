/**
 * Reports which widgets (if any) the user has actually placed (home screen,
 * lock screen, StandBy, ...) — used by `trackWidgetAdoption.ts` to measure
 * widget adoption. Backed by a native WidgetKit bridge that only exists on
 * iOS (see `getInstalledWidgets.ios.ts` and
 * `ios/MetaMask/NativeModules/RCTWidgetInfo/`).
 *
 * This base file (paired with `getInstalledWidgets.ios.ts`) is what Metro's
 * platform-extension resolution falls back to on every platform other than
 * iOS, mirroring `createMetaMaskWidget.ts` — so callers never need a
 * `Platform.OS` branch of their own.
 */
export interface InstalledWidget {
  /** Matches the `name` passed to `createMetaMaskWidget` (e.g. `BALANCE_WIDGET_NAME`). */
  kind: string;
  /** WidgetKit family, e.g. `"systemSmall"`, `"systemMedium"`. */
  family: string;
}

export async function getInstalledWidgets(): Promise<InstalledWidget[]> {
  return [];
}
