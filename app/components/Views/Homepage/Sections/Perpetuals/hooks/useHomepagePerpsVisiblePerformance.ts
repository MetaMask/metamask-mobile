import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type RefObject,
} from 'react';
import { AppState, type View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import performance from 'react-native-performance';
import useSectionViewportVisible from '../../../hooks/useSectionViewportVisible';
import {
  activateHomepagePerformanceProbe,
  createHomepagePerformanceDemand,
  createHomepagePerpsResidentDelivery,
  handleHomepagePerformanceAppStateChange,
  isHomepagePerpsDeliveryFreshForDemand,
  logHomepagePerformanceStage,
  markHomepagePerformanceDemandComplete,
  markHomepagePerpsNavigateReturn,
  recordHomepagePerpsErrorFrame,
  recordHomepagePerpsVisibleFrame,
  subscribeHomepagePerformanceLifecycleChange,
  type HomepagePerpsContentVariant,
  type HomepagePerformanceDemand,
  type HomepagePerpsDeliveryMetadata,
} from '../../../../../UI/Perps/utils/homepagePerformanceProbe';

interface UseHomepagePerpsVisiblePerformanceOptions {
  sectionRef: RefObject<View | null>;
  willRender: boolean;
  hasConnectionError: boolean;
  isConnectionLive?: boolean;
  contentVariant: HomepagePerpsContentVariant;
  itemCount: number;
  positionsCount: number;
  ordersCount: number;
  marketsCount?: number;
  positionsDelivery?: HomepagePerpsDeliveryMetadata;
  ordersDelivery?: HomepagePerpsDeliveryMetadata;
  marketsDelivery?: HomepagePerpsDeliveryMetadata;
}

const useHomepagePerpsVisiblePerformanceDev = ({
  sectionRef,
  willRender,
  hasConnectionError,
  isConnectionLive = false,
  contentVariant,
  itemCount,
  positionsCount,
  ordersCount,
  marketsCount = 0,
  positionsDelivery,
  ordersDelivery,
  marketsDelivery,
}: UseHomepagePerpsVisiblePerformanceOptions) => {
  const isHomeFocused = useIsFocused();
  const { isVisible, onLayout } = useSectionViewportVisible(sectionRef, {
    isLoading: false,
  });
  const currentDemandRef = useRef<HomepagePerformanceDemand | undefined>(
    undefined,
  );
  const releaseObservationRef = useRef<(() => void) | undefined>(undefined);
  const loggedDeliveryIdsRef = useRef(new Set<string>());
  const valuesRef = useRef({
    willRender,
    contentVariant,
    itemCount,
    positionsCount,
    ordersCount,
    marketsCount,
    positionsDelivery,
    ordersDelivery,
    marketsDelivery,
    isConnectionLive,
  });
  valuesRef.current = {
    willRender,
    contentVariant,
    itemCount,
    positionsCount,
    ordersCount,
    marketsCount,
    positionsDelivery,
    ordersDelivery,
    marketsDelivery,
    isConnectionLive,
  };

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      handleHomepagePerformanceAppStateChange,
    );
    return () => subscription.remove();
  }, []);

  const releaseObservation = useCallback((demandId?: string) => {
    if (
      demandId !== undefined &&
      currentDemandRef.current?.demandId !== demandId
    ) {
      return;
    }
    releaseObservationRef.current?.();
    releaseObservationRef.current = undefined;
  }, []);

  const startDemand = useCallback(() => {
    releaseObservation();
    releaseObservationRef.current = activateHomepagePerformanceProbe();
    loggedDeliveryIdsRef.current.clear();
    currentDemandRef.current = createHomepagePerformanceDemand();
  }, [releaseObservation]);

  const observeVisibleDeliveries = useCallback(
    (
      deliveries: (HomepagePerpsDeliveryMetadata | undefined)[],
      forceVisible = false,
    ) => {
      const values = valuesRef.current;
      if ((!isVisible && !forceVisible) || !values.willRender) return;

      const renderDeliveries = deliveries.filter(
        (delivery): delivery is HomepagePerpsDeliveryMetadata =>
          delivery !== undefined,
      );
      if (
        values.contentVariant === 'trending' ||
        values.contentVariant === 'pills'
      ) {
        const streams = new Set(
          renderDeliveries.map((delivery) => delivery.stream),
        );
        if (!streams.has('positions')) {
          renderDeliveries.push(
            createHomepagePerpsResidentDelivery({
              stream: 'positions',
              itemCount: values.positionsCount,
            }),
          );
        }
        if (!streams.has('orders')) {
          renderDeliveries.push(
            createHomepagePerpsResidentDelivery({
              stream: 'orders',
              itemCount: values.ordersCount,
            }),
          );
        }
      }
      const newDeliveries = renderDeliveries.filter(
        ({ deliveryId }) => !loggedDeliveryIdsRef.current.has(deliveryId),
      );
      const demand = currentDemandRef.current;
      if (!demand || newDeliveries.length === 0) return;

      newDeliveries.forEach(({ deliveryId }) =>
        loggedDeliveryIdsRef.current.add(deliveryId),
      );
      const reactCommitAtMonotonicMs = performance.now();
      const detail = {
        demand_id: demand.demandId,
        content_variant: values.contentVariant,
        visible_item_count: values.itemCount,
        elapsed_ms: Number(
          (reactCommitAtMonotonicMs - demand.startedAtMonotonicMs).toFixed(3),
        ),
      };
      newDeliveries.forEach((delivery) => {
        logHomepagePerformanceStage('react_commit', delivery, {
          ...detail,
          data_ready_at_demand:
            delivery.receivedAtMonotonicMs <= demand.startedAtMonotonicMs,
          fresh_for_lifecycle: isHomepagePerpsDeliveryFreshForDemand(
            delivery,
            demand,
          ),
        });
        logHomepagePerformanceStage('values_visible', delivery, {
          ...detail,
          data_ready_at_demand:
            delivery.receivedAtMonotonicMs <= demand.startedAtMonotonicMs,
          fresh_for_lifecycle: isHomepagePerpsDeliveryFreshForDemand(
            delivery,
            demand,
          ),
        });
      });

      requestAnimationFrame(() => {
        logHomepagePerformanceStage(
          'first_frame_checkpoint',
          undefined,
          detail,
        );
        requestAnimationFrame(() => {
          if (currentDemandRef.current?.demandId !== demand.demandId) return;

          const frameCheckpointAtMonotonicMs = performance.now();
          newDeliveries.forEach((delivery) =>
            logHomepagePerformanceStage('next_frame_checkpoint', delivery, {
              ...detail,
              fresh_for_lifecycle: isHomepagePerpsDeliveryFreshForDemand(
                delivery,
                demand,
              ),
              frame_checkpoint_monotonic_ms: Number(
                frameCheckpointAtMonotonicMs.toFixed(3),
              ),
            }),
          );
          recordHomepagePerpsVisibleFrame({
            demand,
            deliveries: renderDeliveries,
            contentVariant: values.contentVariant,
            isConnectionLive: values.isConnectionLive,
            reactCommitAtMonotonicMs,
            frameCheckpointAtMonotonicMs,
          });
          if (demand.firstFreshVisibleRecorded) {
            markHomepagePerformanceDemandComplete();
            releaseObservation(demand.demandId);
          }
        });
      });
    },
    [isVisible, releaseObservation],
  );

  const startDemandWithResidentState = useCallback(() => {
    startDemand();
    const values = valuesRef.current;
    const requiresResolvedEmptyAccount =
      values.contentVariant === 'trending' || values.contentVariant === 'pills';
    [
      values.positionsDelivery,
      values.ordersDelivery,
      values.marketsDelivery,
    ].forEach((delivery) => {
      if (delivery) loggedDeliveryIdsRef.current.add(delivery.deliveryId);
    });
    observeVisibleDeliveries(
      [
        values.positionsDelivery
          ? createHomepagePerpsResidentDelivery({
              stream: 'positions',
              itemCount: values.positionsCount,
              previousDelivery: values.positionsDelivery,
            })
          : values.positionsCount > 0 || requiresResolvedEmptyAccount
            ? createHomepagePerpsResidentDelivery({
                stream: 'positions',
                itemCount: values.positionsCount,
              })
            : undefined,
        values.ordersDelivery
          ? createHomepagePerpsResidentDelivery({
              stream: 'orders',
              itemCount: values.ordersCount,
              previousDelivery: values.ordersDelivery,
            })
          : values.ordersCount > 0 || requiresResolvedEmptyAccount
            ? createHomepagePerpsResidentDelivery({
                stream: 'orders',
                itemCount: values.ordersCount,
              })
            : undefined,
        values.marketsDelivery
          ? createHomepagePerpsResidentDelivery({
              stream: 'markets',
              itemCount: values.marketsCount,
              previousDelivery: values.marketsDelivery,
            })
          : values.marketsCount > 0
            ? createHomepagePerpsResidentDelivery({
                stream: 'markets',
                itemCount: values.marketsCount,
              })
            : undefined,
      ],
      true,
    );
  }, [observeVisibleDeliveries, startDemand]);

  const lostHomeFocusRef = useRef(false);
  useLayoutEffect(() => {
    if (!isHomeFocused) {
      lostHomeFocusRef.current = true;
    } else if (lostHomeFocusRef.current) {
      lostHomeFocusRef.current = false;
      markHomepagePerpsNavigateReturn();
    }
  }, [isHomeFocused]);

  const wasVisibleRef = useRef(false);
  useLayoutEffect(() => {
    if (isVisible && !wasVisibleRef.current) {
      startDemandWithResidentState();
    } else if (!isVisible && wasVisibleRef.current) {
      releaseObservation();
      currentDemandRef.current = undefined;
      loggedDeliveryIdsRef.current.clear();
    }
    wasVisibleRef.current = isVisible;
  }, [isVisible, releaseObservation, startDemandWithResidentState]);

  useEffect(
    () =>
      subscribeHomepagePerformanceLifecycleChange(() => {
        if (isVisible && currentDemandRef.current) {
          startDemandWithResidentState();
        }
      }),
    [isVisible, startDemandWithResidentState],
  );

  useLayoutEffect(() => {
    observeVisibleDeliveries([
      positionsDelivery,
      ordersDelivery,
      marketsDelivery,
    ]);
  }, [
    marketsDelivery,
    observeVisibleDeliveries,
    ordersDelivery,
    positionsDelivery,
  ]);

  useLayoutEffect(() => {
    const demand = currentDemandRef.current;
    if (!isVisible || !hasConnectionError || !demand) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        recordHomepagePerpsErrorFrame({
          demand,
          frameCheckpointAtMonotonicMs: performance.now(),
        });
        markHomepagePerformanceDemandComplete();
        releaseObservation(demand.demandId);
      });
    });
  }, [hasConnectionError, isVisible, releaseObservation]);

  useEffect(() => () => releaseObservation(), [releaseObservation]);

  return onLayout;
};

const useHomepagePerpsVisiblePerformanceDisabled =
  (_options: UseHomepagePerpsVisiblePerformanceOptions) => () =>
    undefined;

export const useHomepagePerpsVisiblePerformance = __DEV__
  ? useHomepagePerpsVisiblePerformanceDev
  : useHomepagePerpsVisiblePerformanceDisabled;
