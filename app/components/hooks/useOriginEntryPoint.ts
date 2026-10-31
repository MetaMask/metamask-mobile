import { useSelector } from 'react-redux';
import { RootState } from '../../reducers';
import { selectActiveTabEntryPointForOrigin } from '../../reducers/browser/selectors';
import type { BrowserEntryPoint } from '../../constants/browser';
import { SourceType } from './useAnalytics/useAnalytics.types';
import type { OriginSource } from './useOriginSource';

/**
 * Discovery entry point of the in-app browser tab behind a connect request.
 * Undefined for non-browser sources (SDK, WalletConnect) and untagged tabs.
 */
export const useOriginEntryPoint = (
  origin: string | undefined,
  originSource: OriginSource | undefined,
): BrowserEntryPoint | undefined => {
  const entryPoint = useSelector((state: RootState) =>
    origin ? selectActiveTabEntryPointForOrigin(state, origin) : undefined,
  );
  return originSource?.source === SourceType.IN_APP_BROWSER
    ? entryPoint
    : undefined;
};
