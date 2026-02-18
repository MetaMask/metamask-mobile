import { useSelector } from 'react-redux';
import { selectWidgetUrl } from '../../../../selectors/rampsController';
import { type BuyWidget } from '@metamask/ramps-controller';

/**
 * Result returned by the useRampsWidgetUrl hook.
 */
export interface UseRampsWidgetUrlResult {
  /**
   * The widget URL data (URL, browser type, order ID), or null if not available.
   */
  widgetUrl: BuyWidget | null;
  /**
   * Whether the widget URL request is currently loading.
   */
  isLoading: boolean;
  /**
   * The error message if the request failed, or null.
   */
  error: string | null;
}

/**
 * Hook to get widget URL state from RampsController.
 * The widget URL is automatically fetched and stored in state
 * whenever the selected quote changes.
 *
 * @returns Widget URL state.
 */
export function useRampsWidgetUrl(): UseRampsWidgetUrlResult {
  const { data: widgetUrl, isLoading, error } = useSelector(selectWidgetUrl);

  return {
    widgetUrl,
    isLoading,
    error,
  };
}

export default useRampsWidgetUrl;
