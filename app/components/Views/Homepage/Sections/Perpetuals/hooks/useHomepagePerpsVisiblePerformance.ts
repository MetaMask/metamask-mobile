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
  accountResolved: boolean;
  marketsCount?: number;
  positionsDelivery?: HomepagePerpsDeliveryMetadata;
  ordersDelivery?: HomepagePerpsDeliveryMetadata;
  accountDelivery?: HomepagePerpsDeliveryMetadata;
  marketsDelivery?: HomepagePerpsDeliveryMetadata;
}

export const useHomepagePerpsVisiblePerformanceDev = ({
  sectionRef,
  willRender,
  hasConnectionError,
  isConnectionLive = false,
  contentVariant,
  itemCount,
  positionsCount,
  ordersCount,
  accountResolved,
  marketsCount = 0,
  positionsDelivery,
  ordersDelivery,
  accountDelivery,
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
  const residentDeliveriesRef = useRef(
    new Map<string, HomepagePerpsDeliveryMetadata>(),
  );
  const valuesRef = useRef({
    willRender,
    hasConnectionError,
    contentVariant,
    itemCount,
    positionsCount,
    ordersCount,
    accountResolved,
    marketsCount,
    positionsDelivery,
    ordersDelivery,
    accountDelivery,
    marketsDelivery,
    isConnectionLive,
  });
  valuesRef.current = {
    willRender,
    hasConnectionError,
    contentVariant,
    itemCount,
    positionsCount,
    ordersCount,
    accountResolved,
    marketsCount,
    positionsDelivery,
    ordersDelivery,
    accountDelivery,
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
    residentDeliveriesRef.current.clear();
    currentDemandRef.current = createHomepagePerformanceDemand();
  }, [releaseObservation]);

  const observeVisibleDeliveries = useCallback(
    (
      deliveries: (HomepagePerpsDeliveryMetadata | undefined)[],
      forceVisible = false,
    ) => {
      const values = valuesRef.current;
      if ((!isVisible && !forceVisible) || !values.willRender) return;

      const incomingDeliveries = deliveries.filter(
        (delivery): delivery is HomepagePerpsDeliveryMetadata =>
          delivery !== undefined,
      );
      incomingDeliveries.forEach((delivery) =>
        residentDeliveriesRef.current.set(delivery.stream, delivery),
      );
      const ensureResident = (
        stream: 'positions' | 'orders' | 'account',
        residentItemCount: number,
      ) => {
        if (
          values.accountResolved &&
          !residentDeliveriesRef.current.has(stream)
        ) {
          residentDeliveriesRef.current.set(
            stream,
            createHomepagePerpsResidentDelivery({
              stream,
              itemCount: residentItemCount,
            }),
          );
        }
      };
      ensureResident('positions', values.positionsCount);
      ensureResident('orders', values.ordersCount);
      ensureResident('account', 1);
      const renderDeliveries = Array.from(
        residentDeliveriesRef.current.values(),
      );
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
            values.isConnectionLive,
          ),
        });
        logHomepagePerformanceStage('surface_initial_ui_recorded', delivery, {
          ...detail,
          data_ready_at_demand:
            delivery.receivedAtMonotonicMs <= demand.startedAtMonotonicMs,
          fresh_for_lifecycle: isHomepagePerpsDeliveryFreshForDemand(
            delivery,
            demand,
            values.isConnectionLive,
          ),
        });
      });

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (currentDemandRef.current?.demandId !== demand.demandId) return;

          const frameCheckpointAtMonotonicMs = performance.now();
          newDeliveries.forEach((delivery) =>
            logHomepagePerformanceStage('next_frame_checkpoint', delivery, {
              ...detail,
              fresh_for_lifecycle: isHomepagePerpsDeliveryFreshForDemand(
                delivery,
                demand,
                values.isConnectionLive,
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
            markHomepagePerformanceDemandComplete(demand);
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
    [
      values.positionsDelivery,
      values.ordersDelivery,
      values.accountDelivery,
      values.marketsDelivery,
    ].forEach((delivery) => {
      if (delivery) loggedDeliveryIdsRef.current.add(delivery.deliveryId);
    });
    observeVisibleDeliveries(
      [
        values.positionsDelivery,
        values.ordersDelivery,
        values.accountDelivery,
        values.marketsDelivery,
      ],
      true,
    );
  }, [observeVisibleDeliveries, startDemand]);

  const lostHomeFocusRef = useRef(false);
  const wasVisibleRef = useRef(false);
  useLayoutEffect(() => {
    if (!isHomeFocused) {
      lostHomeFocusRef.current = true;
      releaseObservation();
      currentDemandRef.current = undefined;
      loggedDeliveryIdsRef.current.clear();
      residentDeliveriesRef.current.clear();
      wasVisibleRef.current = false;
    } else if (lostHomeFocusRef.current) {
      lostHomeFocusRef.current = false;
      markHomepagePerpsNavigateReturn();
    }
  }, [isHomeFocused, releaseObservation]);

  useLayoutEffect(() => {
    if (isHomeFocused && isVisible && !wasVisibleRef.current) {
      startDemandWithResidentState();
    } else if (!isVisible && wasVisibleRef.current) {
      releaseObservation();
      currentDemandRef.current = undefined;
      loggedDeliveryIdsRef.current.clear();
    }
    wasVisibleRef.current = isVisible;
  }, [
    isHomeFocused,
    isVisible,
    releaseObservation,
    startDemandWithResidentState,
  ]);

  const scheduleErrorFrame = useCallback(
    (demand: HomepagePerformanceDemand) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (
            currentDemandRef.current?.demandId !== demand.demandId ||
            !isHomeFocused ||
            !isVisible
          ) {
            return;
          }
          recordHomepagePerpsErrorFrame({
            demand,
            frameCheckpointAtMonotonicMs: performance.now(),
          });
          markHomepagePerformanceDemandComplete(demand);
          releaseObservation(demand.demandId);
        });
      });
    },
    [isHomeFocused, isVisible, releaseObservation],
  );

  useEffect(
    () =>
      subscribeHomepagePerformanceLifecycleChange(() => {
        if (isHomeFocused && isVisible && currentDemandRef.current) {
          startDemandWithResidentState();
          const demand = currentDemandRef.current;
          if (valuesRef.current.hasConnectionError && demand) {
            scheduleErrorFrame(demand);
          }
        }
      }),
    [
      isHomeFocused,
      isVisible,
      scheduleErrorFrame,
      startDemandWithResidentState,
    ],
  );

  useLayoutEffect(() => {
    observeVisibleDeliveries([
      positionsDelivery,
      ordersDelivery,
      accountDelivery,
      marketsDelivery,
    ]);
  }, [
    marketsDelivery,
    observeVisibleDeliveries,
    ordersDelivery,
    accountDelivery,
    positionsDelivery,
  ]);

  useLayoutEffect(() => {
    const demand = currentDemandRef.current;
    if (!isVisible || !hasConnectionError || !demand) return;
    scheduleErrorFrame(demand);
  }, [hasConnectionError, isVisible, scheduleErrorFrame]);

  useEffect(() => () => releaseObservation(), [releaseObservation]);

  return onLayout;
};

const NOOP_LAYOUT = () => undefined;
const useHomepagePerpsVisiblePerformanceDisabled = (
  _options: UseHomepagePerpsVisiblePerformanceOptions,
) => NOOP_LAYOUT;

export const useHomepagePerpsVisiblePerformance = __DEV__
  ? useHomepagePerpsVisiblePerformanceDev
  : useHomepagePerpsVisiblePerformanceDisabled;
