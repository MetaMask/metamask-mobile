export const getModel = () => Promise.resolve('iPhone 12');
export const getApplicationName = () => Promise.resolve('applicationName');
export const getVersion = () => Promise.resolve('version');
export const getSystemVersion = () => '14.5';
export const getBuildNumber = () => Promise.resolve('500');
export const hasNotch = () => true;
export const getBrand = () => 'Apple';
// An iPhone 12's 4 GiB, so `getHardwareTier()` resolves to MID.
export const getTotalMemorySync = () => 4 * 1024 ** 3;
