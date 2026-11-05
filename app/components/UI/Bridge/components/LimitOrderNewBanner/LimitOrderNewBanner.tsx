import React, { startTransition, useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { LIMIT_ORDER_NEW_BANNER_DISMISSED } from '../../../../../constants/storage';
import StorageWrapper from '../../../../../store/storage-wrapper';
import { selectBridgeLimitOrderTabEnabledFlag } from '../../../../../selectors/bridge/featureFlags';
import { BridgeTabKey } from '../../Views/BridgeView/BridgeView.constants';
import { useBridgeSession } from '../../hooks/useBridgeSession';
import { DismissableBanner } from '../../../DismissableBanner';

export const LIMIT_ORDER_NEW_BANNER_TEST_ID = 'limit-order-new-banner';
export const LIMIT_ORDER_NEW_BANNER_DISMISS_TEST_ID =
  'limit-order-new-banner-dismiss';

export function useLimitOrderNewBanner() {
  const isLimitOrderTabEnabled = useSelector(
    selectBridgeLimitOrderTabEnabledFlag,
  );
  const { setSelectedTab, setRenderedTab } = useBridgeSession();
  const [isDismissed, setIsDismissed] = useState(
    () =>
      StorageWrapper.getItemSync(LIMIT_ORDER_NEW_BANNER_DISMISSED) === 'true',
  );

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    StorageWrapper.setItem(LIMIT_ORDER_NEW_BANNER_DISMISSED, 'true').catch(
      () => undefined,
    );
  }, []);

  const handlePress = useCallback(() => {
    setSelectedTab(BridgeTabKey.Limit);
    startTransition(() => setRenderedTab(BridgeTabKey.Limit));
  }, [setRenderedTab, setSelectedTab]);

  return {
    dismiss,
    handlePress,
    shouldShow: isLimitOrderTabEnabled && !isDismissed,
  };
}

export function LimitOrderNewBanner() {
  const { dismiss, handlePress, shouldShow } = useLimitOrderNewBanner();

  if (!shouldShow) {
    return null;
  }

  return (
    <DismissableBanner
      title={strings('bridge.limit_order_new_banner_title')}
      description={strings('bridge.limit_order_new_banner_description')}
      onPress={handlePress}
      onDismiss={dismiss}
      testID={LIMIT_ORDER_NEW_BANNER_TEST_ID}
      dismissTestID={LIMIT_ORDER_NEW_BANNER_DISMISS_TEST_ID}
    />
  );
}

export default LimitOrderNewBanner;
