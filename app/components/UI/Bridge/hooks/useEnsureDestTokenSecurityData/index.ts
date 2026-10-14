import { useEffect, useRef } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { fetchTokenAssets } from '@metamask/assets-controllers';
import type { RootState } from '../../../../../reducers';
import {
  selectDestToken,
  setDestToken,
} from '../../../../../core/redux/slices/bridge';
import { isSameBridgeToken, tokenToIncludeAsset } from '../../utils/tokenUtils';
import { adaptTokenSecurityData } from '../../utils/tokenSecurityUtils';
import type { SecurityData } from '../../types';

/**
 * Fills in `securityData` for destination tokens that entered the bridge state
 * without it (deeplinks, watchlist, token details, repeat-swap flows, etc.).
 * The security banner, warning modal and analytics all read it from state.
 */
export const useEnsureDestTokenSecurityData = () => {
  const dispatch = useDispatch();
  const store = useStore<RootState>();
  const destToken = useSelector(selectDestToken);
  // `null` means fetched without data, or still in flight.
  const securityDataByAssetId = useRef(new Map<string, SecurityData | null>());

  useEffect(() => {
    if (!destToken || destToken.securityData?.type) return;

    const assetId = tokenToIncludeAsset(destToken)?.assetId;
    if (!assetId) return;

    if (securityDataByAssetId.current.has(assetId)) {
      const securityData = securityDataByAssetId.current.get(assetId);
      if (securityData) {
        dispatch(setDestToken({ ...destToken, securityData }));
      }
      return;
    }
    securityDataByAssetId.current.set(assetId, null);

    fetchTokenAssets([assetId], { includeTokenSecurityData: true })
      .then((assets) => {
        const securityData = adaptTokenSecurityData(assets?.[0]?.securityData);
        securityDataByAssetId.current.set(assetId, securityData ?? null);
        const currentDestToken = selectDestToken(store.getState());
        if (
          !securityData ||
          !currentDestToken ||
          currentDestToken.securityData?.type ||
          !isSameBridgeToken(currentDestToken, destToken)
        ) {
          return;
        }
        dispatch(setDestToken({ ...currentDestToken, securityData }));
      })
      .catch(() => {
        securityDataByAssetId.current.delete(assetId);
      });
  }, [destToken, dispatch, store]);
};
