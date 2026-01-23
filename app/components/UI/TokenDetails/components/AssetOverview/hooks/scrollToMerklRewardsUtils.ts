import { DeviceEventEmitter } from 'react-native';

export const SCROLL_PADDING = 350;
export const MAX_RETRIES = 10;
export const RETRY_DELAY_MS = 100;
export const SCROLL_DELAY_MS = 150;

/**
 * Emits the scroll event to scroll to MerklRewards section
 */
export const emitScrollToMerklRewards = (scrollY: number) => {
  DeviceEventEmitter.emit('scrollToMerklRewards', { y: scrollY });
};
