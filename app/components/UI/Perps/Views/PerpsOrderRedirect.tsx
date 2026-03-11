import React, { useEffect, useRef } from 'react';
import {
  useNavigation,
  useRoute,
  RouteProp,
  StackActions,
} from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import Routes from '../../../../constants/navigation/Routes';
import { usePerpsConnection } from '../hooks/usePerpsConnection';
import { usePerpsNetworkManagement } from '../hooks/usePerpsNetworkManagement';
import { usePerpsTrading } from '../hooks/usePerpsTrading';
import usePerpsToasts from '../hooks/usePerpsToasts';
import PerpsLoader from '../components/PerpsLoader';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
import { PERPS_CONSTANTS, PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import { CONFIRMATION_HEADER_CONFIG } from '../constants/perpsConfig';
import type { PerpsNavigationParamList } from '../types/navigation';

type RouteParams = RouteProp<PerpsNavigationParamList, 'PerpsOrderRedirect'>;

/**
 * PerpsOrderRedirect
 *
 * A redirect screen that handles navigation from Token Details to the Perps order confirmation.
 * This screen:
 * 1. Waits for the WebSocket connection to be established (via PerpsConnectionProvider)
 * 2. Ensures Arbitrum network exists (adds it if missing, same as in-Perps deposit flow)
 * 3. Calls depositWithOrder() to create the pending transaction
 * 4. Navigates to the confirmation screen with the transaction ready
 *
 * This is necessary because Token Details is outside the Perps stack, so the WebSocket
 * is not initialized there. By navigating to this screen first, we ensure the WebSocket
 * is ready before calling depositWithOrder().
 */
const PerpsOrderRedirect: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();
  const {
    direction,
    asset,
    fromTokenDetails,
    assetsASSETS2493AbtestTokenDetailsLayout,
  } = route.params;

  const { isConnected, isInitialized } = usePerpsConnection();
  const { ensureArbitrumNetworkExists } = usePerpsNetworkManagement();
  const { depositWithOrder } = usePerpsTrading();
  const { showToast, PerpsToastOptions } = usePerpsToasts();

  const hasStartedRef = useRef(false);
  useEffect(() => {
    // Wait for WebSocket to be ready
    if (!isConnected || !isInitialized) return;
    // Prevent double execution
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    Logger.log(
      '[PerpsOrderRedirect] Ensuring Arbitrum network, then starting depositWithOrder',
      {
        direction,
        asset,
      },
    );

    ensureArbitrumNetworkExists()
      .then(() => depositWithOrder())
      .then(() => {
        Logger.log(
          '[PerpsOrderRedirect] depositWithOrder resolved, navigating to confirmation',
        );
        // Replace current screen with confirmation (no back to loader)
        navigation.dispatch(
          StackActions.replace(
            Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
            {
              direction,
              asset,
              fromTokenDetails,
              assetsASSETS2493AbtestTokenDetailsLayout,
              source: PERPS_EVENT_VALUE.SOURCE.ASSET_DETAIL_SCREEN,
              showPerpsHeader:
                CONFIRMATION_HEADER_CONFIG.ShowPerpsHeaderForDepositAndTrade,
            },
          ),
        );
      })
      .catch((error: unknown) => {
        const err = ensureError(error, 'PerpsOrderRedirect.depositWithOrder');
        Logger.error(err, {
          tags: { feature: PERPS_CONSTANTS.FeatureName },
          context: { name: 'PerpsOrderRedirect.depositWithOrder', data: {} },
        });
        showToast(
          PerpsToastOptions.accountManagement.oneClickTrade.txCreationFailed,
        );
        // Go back to token details on failure
        navigation.goBack();
      });
  }, [
    isConnected,
    isInitialized,
    direction,
    asset,
    fromTokenDetails,
    assetsASSETS2493AbtestTokenDetailsLayout,
    ensureArbitrumNetworkExists,
    depositWithOrder,
    navigation,
    showToast,
    PerpsToastOptions,
  ]);

  // Match PerpsLoadingSkeleton layout ("Connecting to Perps") so both loaders look the same: top-aligned, centered, pt-20
  return (
    <Box
      twClassName="flex-1 bg-default pt-20"
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Start}
    >
      <PerpsLoader message="Preparing order..." fullScreen={false} />
    </Box>
  );
};

export default PerpsOrderRedirect;
