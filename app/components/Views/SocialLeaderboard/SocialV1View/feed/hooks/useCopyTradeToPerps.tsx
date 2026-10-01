import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Modal, View } from 'react-native';
import { useSelector } from 'react-redux';
import Routes from '../../../../../../constants/navigation/Routes';
import { selectSelectedInternalAccountAddress } from '../../../../../../selectors/accountsController';
import { useComplianceGate } from '../../../../../UI/Compliance';
import PerpsBottomSheetTooltip from '../../../../../UI/Perps/components/PerpsBottomSheetTooltip';
import { selectPerpsEligibility } from '../../../../../UI/Perps/selectors/perpsController';
import ModalSafeAreaProvider from '../../../../../../component-library/components-temp/ModalSafeAreaProvider';
import type { SocialV1FeedItem } from '../types';
import { SocialV1ViewSelectorsIDs } from '../../SocialV1View.testIds';

export const SOCIAL_FEED_COPY_TRADE_GEO_BLOCK_TEST_ID =
  SocialV1ViewSelectorsIDs.COPY_TRADE_GEO_BLOCK;

export interface UseCopyTradeToPerpsResult {
  /** Undefined unless the item is an open perp. Spot copy trade stays unwired. */
  onCopyTrade?: () => void;
  /** Render next to the card: the geo block shown to an ineligible trader. */
  geoBlockSheet: React.ReactNode;
}

/**
 * Copy trade for an open perp: the compliance gate runs first and shows the
 * access-restricted modal on its own when the wallet is blocked. Inside the
 * gate, an ineligible region gets the geo block; otherwise the perps order
 * redirect in the transparent Perps modal stack brings the websocket up and
 * opens the trade bottom sheet over this page.
 */
export const useCopyTradeToPerps = (
  item: SocialV1FeedItem,
): UseCopyTradeToPerpsResult => {
  const navigation = useNavigation();
  const isEligible = useSelector(selectPerpsEligibility);
  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);
  const { gate } = useComplianceGate(selectedAddress ?? '');
  const [isGeoBlockVisible, setIsGeoBlockVisible] = useState(false);

  const handleCopyTrade = useCallback(() => {
    if (item.variant !== 'perpsOpen') {
      return;
    }
    const { direction, asset, leverage } = item;
    gate(async () => {
      if (!isEligible) {
        setIsGeoBlockVisible(true);
        return;
      }
      // The modal stack is transparent, so the sheet opens over this page
      // rather than on top of a Perps screen. After submit we stay here;
      // the same Perps toasts report the order.
      navigation.navigate(Routes.PERPS.MODALS.ROOT, {
        screen: Routes.PERPS.ORDER_REDIRECT,
        params: {
          direction,
          asset: asset.symbol,
          leverage,
          useBottomSheet: true,
          stayOnCurrentScreen: true,
        },
      });
    }).catch(() => undefined);
  }, [gate, isEligible, item, navigation]);

  const closeGeoBlock = useCallback(() => setIsGeoBlockVisible(false), []);

  // The card sits inside a list, so the sheet is hoisted into a Modal the same
  // way Market Insights does; the View wrapper keeps Android from freezing.
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

  return {
    onCopyTrade: item.variant === 'perpsOpen' ? handleCopyTrade : undefined,
    geoBlockSheet,
  };
};
