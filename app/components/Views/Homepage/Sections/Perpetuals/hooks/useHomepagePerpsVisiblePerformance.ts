import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { AppState, type View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import performance from 'react-native-performance';
import useSectionViewportVisible from '../../../hooks/useSectionViewportVisible';
import {
  createHomepagePerformanceDemand,
  createHomepagePerpsResidentDelivery,
  handleHomepagePerformanceAppStateChange,
  logHomepagePerformanceStage,
  markHomepagePerformanceFrameComplete,
  markHomepagePerpsNavigateReturn,
  recordHomepagePerpsErrorFrame,
  recordHomepagePerpsVisibleFrame,
  subscribeHomepagePerformanceLifecycleChange,
  type HomepagePerpsContentVariant,
  type HomepagePerformanceDemand,
  type HomepagePerpsDeliveryMetadata,
} from '../../../../../UI/Perps/utils/homepagePerformanceProbe';

interface UseHomepagePerpsVisiblePerformanceOptions {
  willRender: boolean;
  hasConnectionError: boolean;
  contentVariant: HomepagePerpsContentVariant;
  itemCount: number;
  positionsCount: number;
  ordersCount: number;
  positionsDelivery?: HomepagePerpsDeliveryMetadata;
  ordersDelivery?: HomepagePerpsDeliveryMetadata;
}

/**
 * Measures the Perps Homepage section only while its content intersects the
 * viewport. A completed observation ends after React commit plus a double-RAF
 * checkpoint and keeps cache/resident content separate from fresh socket data.
 */
export const useHomepagePerpsVisiblePerformance = ({
  willRender,
  hasConnectionError,
  contentVariant,
  itemCount,
  positionsCount,
  ordersCount,
  positionsDelivery,
  ordersDelivery,
}: UseHomepagePerpsVisiblePerformanceOptions) => {
  const contentViewRef = useRef<View>(null);
  const isHomeFocused = useIsFocused();
  const { isVisible, onLayout } = useSectionViewportVisible(contentViewRef, {
    isLoading: false,
  });
  const currentDemandRef = useRef<HomepagePerformanceDemand | undefined>(
    undefined,
  );
  const loggedCommitIdsRef = useRef(new Set<string>());
  const scheduledErrorDemandIdsRef = useRef(new Set<string>());

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      handleHomepagePerformanceAppStateChange,
    );
    return () => subscription.remove();
  }, []);

  const startDemand = useCallback(() => {
    loggedCommitIdsRef.current.clear();
    currentDemandRef.current = createHomepagePerformanceDemand();
  }, []);

  useLayoutEffect(() => {
    if (isVisible) {
      startDemand();
    } else {
      currentDemandRef.current = undefined;
      loggedCommitIdsRef.current.clear();
    }
  }, [isVisible, startDemand]);

  const observeVisibleDeliveries = useCallback(
    (deliveries: (HomepagePerpsDeliveryMetadata | undefined)[]) => {
      if (!isVisible || !willRender) {
        return;
      }

      const renderDeliveries = deliveries.filter(
        (delivery): delivery is HomepagePerpsDeliveryMetadata =>
          delivery !== undefined,
      );
      const newDeliveries = renderDeliveries.filter(
        (delivery) => !loggedCommitIdsRef.current.has(delivery.deliveryId),
      );
      const demand = currentDemandRef.current;
      if (!demand || newDeliveries.length === 0) {
        return;
      }

      newDeliveries.forEach((delivery) =>
        loggedCommitIdsRef.current.add(delivery.deliveryId),
      );
      const reactCommitAtMonotonicMs = performance.now();
      const detail = {
        demand_id: demand.demandId,
        content_variant: contentVariant,
        visible_item_count: itemCount,
      };
      newDeliveries.forEach((delivery) =>
        logHomepagePerformanceStage('react_commit', delivery, detail),
      );

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const frameCheckpointAtMonotonicMs = performance.now();
          newDeliveries.forEach((delivery) => {
            logHomepagePerformanceStage('next_frame_checkpoint', delivery, {
              ...detail,
              frame_checkpoint_monotonic_ms: Number(
                frameCheckpointAtMonotonicMs.toFixed(3),
              ),
            });
            markHomepagePerformanceFrameComplete(delivery);
          });
          recordHomepagePerpsVisibleFrame({
            demand,
            deliveries: renderDeliveries,
            contentVariant,
            reactCommitAtMonotonicMs,
            frameCheckpointAtMonotonicMs,
          });
        });
      });
    },
    [contentVariant, isVisible, itemCount, willRender],
  );

  const observeResidentState = useCallback(() => {
    observeVisibleDeliveries([
      createHomepagePerpsResidentDelivery({
        stream: 'positions',
        itemCount: positionsCount,
        previousDelivery: positionsDelivery,
      }),
      createHomepagePerpsResidentDelivery({
        stream: 'orders',
        itemCount: ordersCount,
        previousDelivery: ordersDelivery,
      }),
    ]);
  }, [
    observeVisibleDeliveries,
    ordersCount,
    ordersDelivery,
    positionsCount,
    positionsDelivery,
  ]);

  useEffect(
    () =>
      subscribeHomepagePerformanceLifecycleChange(() => {
        if (isVisible) {
          startDemand();
          observeResidentState();
        }
      }),
    [isVisible, observeResidentState, startDemand],
  );

  const lostHomeFocusRef = useRef(false);
  useEffect(() => {
    if (!isHomeFocused) {
      lostHomeFocusRef.current = true;
      return;
    }
    if (lostHomeFocusRef.current && isVisible) {
      lostHomeFocusRef.current = false;
      markHomepagePerpsNavigateReturn();
    }
  }, [isHomeFocused, isVisible]);

  useLayoutEffect(() => {
    observeVisibleDeliveries([positionsDelivery, ordersDelivery]);
  }, [observeVisibleDeliveries, ordersDelivery, positionsDelivery]);

  useLayoutEffect(() => {
    const demand = currentDemandRef.current;
    if (
      !isVisible ||
      !hasConnectionError ||
      !demand ||
      scheduledErrorDemandIdsRef.current.has(demand.demandId)
    ) {
      return;
    }

    scheduledErrorDemandIdsRef.current.add(demand.demandId);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        recordHomepagePerpsErrorFrame({
          demand,
          frameCheckpointAtMonotonicMs: performance.now(),
        });
      });
    });
  }, [hasConnectionError, isVisible]);

  return { contentViewRef, onContentViewportLayout: onLayout };
};
