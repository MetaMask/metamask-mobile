import {
  getAppIconName,
  resetAppIcon,
  setAlternateAppIcon,
  supportsAlternateIcons,
} from 'expo-alternate-app-icons';

export type AppIconName = 'default' | 'Gold';

export { supportsAlternateIcons };

/**
 * Returns the currently active icon name, or 'default' if the primary icon
 * is active or the native module is not yet available (pre-prebuild).
 */
export function getAppIcon(): AppIconName {
  try {
    return (getAppIconName() as AppIconName) ?? 'default';
  } catch {
    return 'default';
  }
}

/**
 * Switches the app launcher icon.
 *
 * Pass 'default' to restore the primary icon, or 'Gold' for the VIP gold icon.
 *
 * On iOS the OS shows a system alert confirming the change — this cannot be
 * suppressed (Apple-enforced behaviour).
 */
export async function setAppIcon(iconName: AppIconName): Promise<void> {
  if (!supportsAlternateIcons) return;
  if (iconName === 'default') {
    await resetAppIcon();
  } else {
    await setAlternateAppIcon(iconName);
  }
}
