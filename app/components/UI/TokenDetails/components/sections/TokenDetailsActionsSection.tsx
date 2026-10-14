import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, View } from 'react-native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type OrderDirection,
} from '@metamask/perps-controller';
import ModalSafeAreaProvider from '../../../../../component-library/components-temp/ModalSafeAreaProvider';
import { MetaMetricsEvents } from '../../../../../core/Analytics/MetaMetrics.events';
import { useComplianceGate } from '../../../Compliance';
import PerpsBottomSheetTooltip from '../../../Perps/components/PerpsBottomSheetTooltip';
import { usePerpsEventTracking } from '../../../Perps/hooks/usePerpsEventTracking';
import { selectPerpsEligibility } from '../../../Perps/selectors/perpsController';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import useTokenBuyability from '../../../Ramp/hooks/useTokenBuyability';
import { TokenDetailsActions } from '../TokenDetailsActions';
import {
  TokenDetailsAction,
  type TokenDetailsRouteParams,
} from '../../constants/constants';
import { usePerpsActions } from '../../hooks/usePerpsActions';
import { useTokenActions } from '../../hooks/useTokenActions';
import { useTokenDetailsActionTracking } from '../../hooks/useTokenDetailsActionTracking';

export const TOKEN_DETAILS_ACTIONS_SECTION_TEST_ID =
  'token-details-actions-section';

export interface UseGatedPerpsEntryParams {
  handlePerpsAction: ((direction: OrderDirection) => void) | undefined;
  onExitAction?: () => void;
  resetNavigationLockRef?: React.RefObject<(() => void) | null>;
  geoBlockTooltipTestID?: string;
}

export interface UseGatedPerpsEntryResult {
  onLong: (() => void) | undefined;
  onShort: (() => void) | undefined;
  isEligibilityModalVisible: boolean;
  closeEligibilityModal: () => void;
  geoBlockTooltip: React.ReactNode;
}

export const useGatedPerpsEntry = ({
  handlePerpsAction,
  onExitAction,
  resetNavigationLockRef,
  geoBlockTooltipTestID = 'token-details-geo-block-tooltip',
}: UseGatedPerpsEntryParams): UseGatedPerpsEntryResult => {
  const isEligible = useSelector(selectPerpsEligibility);
  const [isEligibilityModalVisible, setIsEligibilityModalVisible] =
    useState(false);
  const { track } = usePerpsEventTracking();

  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);
  const { gate } = useComplianceGate(selectedAddress ?? '');

  const closeEligibilityModal = useCallback(() => {
    setIsEligibilityModalVisible(false);
    resetNavigationLockRef?.current?.();
  }, [resetNavigationLockRef]);

  const createEntryHandler = useCallback(
    (direction: OrderDirection) => () =>
      gate(async () => {
        if (!isEligible) {
          track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
            [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
              PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
            [PERPS_EVENT_PROPERTY.SOURCE]:
              PERPS_EVENT_VALUE.SOURCE.ASSET_DETAIL_SCREEN,
          });
          setIsEligibilityModalVisible(true);
          return;
        }
        onExitAction?.();
        handlePerpsAction?.(direction);
      }).finally(() => {
        resetNavigationLockRef?.current?.();
      }),
    [
      gate,
      isEligible,
      track,
      handlePerpsAction,
      onExitAction,
      resetNavigationLockRef,
    ],
  );

  const onLong = useMemo(
    () => (handlePerpsAction ? createEntryHandler('long') : undefined),
    [handlePerpsAction, createEntryHandler],
  );
  const onShort = useMemo(
    () => (handlePerpsAction ? createEntryHandler('short') : undefined),
    [handlePerpsAction, createEntryHandler],
  );

  const geoBlockTooltip = isEligibilityModalVisible ? (
    <View>
      <Modal visible transparent animationType="none" statusBarTranslucent>
        <ModalSafeAreaProvider>
          <PerpsBottomSheetTooltip
            isVisible
            onClose={closeEligibilityModal}
            contentKey="geo_block"
            testID={geoBlockTooltipTestID}
          />
        </ModalSafeAreaProvider>
      </Modal>
    </View>
  ) : null;

  return {
    onLong,
    onShort,
    isEligibilityModalVisible,
    closeEligibilityModal,
    geoBlockTooltip,
  };
};

export interface TokenDetailsActionsSectionPerpsMarket {
  hasPerpsMarket: boolean;
  isLoading: boolean;
  handlePerpsAction: ((direction: OrderDirection) => void) | undefined;
}

export interface TokenDetailsActionsSectionProps {
  token: TokenDetailsRouteParams;
  networkName?: string;
  severity?: string;
  onBuy?: () => void;
  onSend?: () => void;
  onReceive?: () => void;
  hasBalance?: boolean;
  perpsMarket?: TokenDetailsActionsSectionPerpsMarket;
  onPerpsMarketResolved?: (result: {
    hasPerpsMarket: boolean;
    isLoading: boolean;
  }) => void;
  onActionTapped?: (action: TokenDetailsAction) => void;
  resetNavigationLockRef?: React.RefObject<(() => void) | null>;
  onExitAction?: () => void;
}

const TokenDetailsActionsSection = ({
  token,
  networkName,
  severity,
  onBuy,
  onSend,
  onReceive,
  hasBalance,
  perpsMarket,
  onPerpsMarketResolved,
  onActionTapped,
  resetNavigationLockRef,
  onExitAction,
}: TokenDetailsActionsSectionProps) => {
  const selfPerpsMarket = usePerpsActions({
    symbol: perpsMarket ? null : token.symbol,
    fromTokenDetails: true,
    transactionActiveAbTests: token.transactionActiveAbTests,
  });

  const hasPerpsMarket =
    perpsMarket?.hasPerpsMarket ?? selfPerpsMarket.hasPerpsMarket;
  const isPerpsLoading = perpsMarket?.isLoading ?? selfPerpsMarket.isLoading;
  const handlePerpsAction =
    perpsMarket?.handlePerpsAction ?? selfPerpsMarket.handlePerpsAction;

  useEffect(() => {
    onPerpsMarketResolved?.({ hasPerpsMarket, isLoading: isPerpsLoading });
  }, [onPerpsMarketResolved, hasPerpsMarket, isPerpsLoading]);

  const { onLong, onShort, geoBlockTooltip } = useGatedPerpsEntry({
    handlePerpsAction,
    onExitAction,
    resetNavigationLockRef,
  });

  const {
    onBuy: defaultOnBuy,
    onSend: defaultOnSend,
    onReceive: defaultOnReceive,
  } = useTokenActions({ token, networkName });
  const { isBuyable, isLoading: isBuyableLoading } = useTokenBuyability(token);

  const effectiveHasBalance =
    hasBalance ?? (Boolean(token.balance) && token.balance !== '0');
  const isNativeCurrency = Boolean(token.isETH || token.isNative);

  const sectionOnActionTapped = useTokenDetailsActionTracking({
    token,
    hasBalance: effectiveHasBalance,
    severity,
  });
  const effectiveOnActionTapped = onActionTapped ?? sectionOnActionTapped;

  return (
    <>
      <Box testID={TOKEN_DETAILS_ACTIONS_SECTION_TEST_ID}>
        <TokenDetailsActions
          hasPerpsMarket={hasPerpsMarket}
          hasBalance={effectiveHasBalance}
          isBuyable={isBuyable}
          isNativeCurrency={isNativeCurrency}
          token={token}
          onBuy={onBuy ?? defaultOnBuy}
          onLong={handlePerpsAction ? onLong : undefined}
          onShort={handlePerpsAction ? onShort : undefined}
          onSend={onSend ?? defaultOnSend}
          onReceive={onReceive ?? defaultOnReceive}
          isLoading={isBuyableLoading || isPerpsLoading}
          resetNavigationLockRef={resetNavigationLockRef}
          onActionTapped={effectiveOnActionTapped}
        />
      </Box>
      {geoBlockTooltip}
    </>
  );
};

TokenDetailsActionsSection.displayName = 'TokenDetailsActionsSection';

export default TokenDetailsActionsSection;
