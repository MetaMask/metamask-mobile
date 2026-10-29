import { useEffect } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { fetchTokenAssets } from '@metamask/assets-controllers';
import type { RootState } from '../../../../../reducers';
import {
  selectDestToken,
  setDestToken,
} from '../../../../../core/redux/slices/bridge';
import { isSameBridgeToken, tokenToIncludeAsset } from '../../utils/tokenUtils';
import { adaptTokenSecurityData } from '../../utils/tokenSecurityUtils';

/**
 * Fills in `securityData` for destination tokens that entered the bridge state
 * without it (deeplinks, watchlist, token details, repeat-swap flows, etc.).
 * The security banner, warning modal and analytics all read it from state.
 */
export const useEnsureDestTokenSecurityData = () => {
  const dispatch = useDispatch();
  const store = useStore<RootState>();
  const destToken = useSelector(selectDestToken);

  useEffect(() => {
    if (!destToken || destToken.securityData?.type) return;

    const assetId = tokenToIncludeAsset(destToken)?.assetId;
    if (!assetId) return;

    fetchTokenAssets([assetId], { includeTokenSecurityData: true })
      .then((assets) => {
        const securityData = adaptTokenSecurityData(assets?.[0]?.securityData);
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
      .catch(() => undefined);
  }, [destToken, dispatch, store]);
};
