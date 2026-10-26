import { PERPS_ORDER_BOOK_SIZE_ON_CLICK } from '../../../../constants/storage';
import StorageWrapper from '../../../../store/storage-wrapper';

/**
 * Whether tapping a Pro order-book row also fills the order size. Off unless
 * the user saved it on. Synchronous so the first render already uses it.
 */
export const getPerpsOrderBookSizeOnClickPreference = (): boolean =>
  StorageWrapper.getItemSync(PERPS_ORDER_BOOK_SIZE_ON_CLICK) === 'true';

/** Persist the Pro order-book size-on-click setting. */
export const setPerpsOrderBookSizeOnClickPreference = (
  sizeOnClick: boolean,
): void => {
  // A lost write only restores the off default next session.
  StorageWrapper.setItem(
    PERPS_ORDER_BOOK_SIZE_ON_CLICK,
    String(sizeOnClick),
  ).catch(() => undefined);
};
