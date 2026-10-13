import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Modal, View } from 'react-native';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { useComplianceGate } from '../../Compliance';
import PerpsBottomSheetTooltip from '../../Perps/components/PerpsBottomSheetTooltip';
import { selectPerpsEligibility } from '../../Perps/selectors/perpsController';
import ModalSafeAreaProvider from '../../../../component-library/components-temp/ModalSafeAreaProvider';
import type { PerpDirection } from '../utils/perp';

export const SOCIAL_FEED_COPY_TRADE_GEO_BLOCK_TEST_ID =
  'social-v1-feed-copy-trade-geo-block';

export interface OpenPerpsOrderParams {
  direction: PerpDirection;
  /** Market as the Perps order sheet names it (HIP-3 `xyz:` prefix kept). */
  asset: string;
  leverage?: number;
}

export interface UseOpenPerpsOrderOptions {
  /**
   * Runs the navigation. Lets a caller that is itself a sheet close first and
   * navigate once it is gone. Defaults to navigating immediately.
   */
  runNavigation?: (navigate: () => void) => void;
}

export interface UseOpenPerpsOrderResult {
  openPerpsOrder: (params: OpenPerpsOrderParams) => void;
  /** Render next to the trigger: the geo block shown to an ineligible trader. */
  geoBlockSheet: React.ReactNode;
}

/**
 * Opens the Perps order sheet for a market. The compliance gate runs first and
 * shows the access-restricted modal on its own when the wallet is blocked.
 * Inside the gate, an ineligible region gets the geo block; otherwise the
 * perps order redirect in the transparent Perps modal stack brings the
 * websocket up and opens the trade bottom sheet over the current page.
 */
export const useOpenPerpsOrder = ({
  runNavigation,
}: UseOpenPerpsOrderOptions = {}): UseOpenPerpsOrderResult => {
  const navigation = useNavigation();
  const isEligible = useSelector(selectPerpsEligibility);
  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);
  const { gate } = useComplianceGate(selectedAddress ?? '');
  const [isGeoBlockVisible, setIsGeoBlockVisible] = useState(false);

  const openPerpsOrder = useCallback(
    ({ direction, asset, leverage }: OpenPerpsOrderParams) => {
      gate(async () => {
        if (!isEligible) {
          setIsGeoBlockVisible(true);
          return;
        }
        // The modal stack is transparent, so the sheet opens over this page
        // rather than on top of a Perps screen. After submit we stay here;
        // the same Perps toasts report the order.
        const navigate = () =>
          navigation.navigate(Routes.PERPS.MODALS.ROOT, {
            screen: Routes.PERPS.ORDER_REDIRECT,
            params: {
              direction,
              asset,
              leverage,
              source: 'trader_feed',
              useBottomSheet: true,
              stayOnCurrentScreen: true,
            },
          });
        if (runNavigation) {
          runNavigation(navigate);
        } else {
          navigate();
        }
      }).catch(() => undefined);
    },
    [gate, isEligible, navigation, runNavigation],
  );

  const closeGeoBlock = useCallback(() => setIsGeoBlockVisible(false), []);

  // Callers sit inside lists or sheets, so the tooltip is hoisted into a Modal
  // the same way Market Insights does; the View wrapper keeps Android from
  // freezing.
  const geoBlockSheet = isGeoBlockVisible ? (
    <View>
      <Modal visible transparent animationType="none" statusBarTranslucent>
        <ModalSafeAreaProvider>
          <PerpsBottomSheetTooltip
            isVisible
            onClose={closeGeoBlock}
            contentKey="geo_block"
            testID={SOCIAL_FEED_COPY_TRADE_GEO_BLOCK_TEST_ID}
          />
        </ModalSafeAreaProvider>
      </Modal>
    </View>
  ) : null;

  return { openPerpsOrder, geoBlockSheet };
};
