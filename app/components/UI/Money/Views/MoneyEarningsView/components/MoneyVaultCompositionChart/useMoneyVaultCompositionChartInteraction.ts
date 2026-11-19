import {
  PanResponder,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getVaultCompositionComponentKeyAtPoint,
  CHART_CENTER,
} from './MoneyVaultCompositionChart.utils';
import type {
  ComponentKey,
  VaultCompositionWedge,
} from './MoneyVaultCompositionChart.types';

interface UseMoneyVaultCompositionChartInteractionOptions {
  wedges: VaultCompositionWedge[];
  defaultActiveKey: ComponentKey | null;
  setScrollEnabled?: (enabled: boolean) => void;
}

export interface UseMoneyVaultCompositionChartInteractionResult {
  activeKey: ComponentKey | null;
  isInteracting: boolean;
  panHandlers: ReturnType<typeof PanResponder.create>['panHandlers'];
  selectNext: () => void;
  selectPrevious: () => void;
}

const getPointFromEvent = (
  event: GestureResponderEvent,
  gestureState?: PanResponderGestureState,
): { x: number; y: number } | null => {
  const { locationX, locationY } = event.nativeEvent;

  if (Number.isFinite(locationX) && Number.isFinite(locationY)) {
    return { x: locationX, y: locationY };
  }

  if (
    gestureState &&
    Number.isFinite(gestureState.moveX) &&
    Number.isFinite(gestureState.moveY)
  ) {
    return {
      x: gestureState.moveX - CHART_CENTER,
      y: gestureState.moveY - CHART_CENTER,
    };
  }

  return null;
};

const useMoneyVaultCompositionChartInteraction = ({
  wedges,
  defaultActiveKey,
  setScrollEnabled,
}: UseMoneyVaultCompositionChartInteractionOptions): UseMoneyVaultCompositionChartInteractionResult => {
  const [activeKey, setActiveKey] = useState<ComponentKey | null>(
    defaultActiveKey,
  );
  const [isInteracting, setIsInteracting] = useState(false);
  const activeKeyRef = useRef<ComponentKey | null>(defaultActiveKey);
  const isInteractingRef = useRef(false);
  const wedgeKeys = useMemo(
    () => wedges.map(({ componentKey }) => componentKey),
    [wedges],
  );

  const selectKey = useCallback((nextKey: ComponentKey | null) => {
    if (nextKey === null) {
      return;
    }

    activeKeyRef.current = nextKey;
    setActiveKey((currentKey) =>
      currentKey === nextKey ? currentKey : nextKey,
    );
  }, []);

  useEffect(() => {
    if (wedgeKeys.length === 0) {
      activeKeyRef.current = null;
      setActiveKey(null);
      isInteractingRef.current = false;
      setIsInteracting(false);
      setScrollEnabled?.(true);
      return;
    }

    const currentKey = activeKeyRef.current;
    const nextKey =
      currentKey !== null && wedgeKeys.includes(currentKey)
        ? currentKey
        : defaultActiveKey;

    activeKeyRef.current = nextKey;
    setActiveKey(nextKey);
  }, [defaultActiveKey, setScrollEnabled, wedgeKeys]);

  useEffect(
    () => () => {
      isInteractingRef.current = false;
      setScrollEnabled?.(true);
    },
    [setScrollEnabled],
  );

  const getKeyAtEvent = useCallback(
    (
      event: GestureResponderEvent,
      gestureState?: PanResponderGestureState,
    ): ComponentKey | null => {
      const point = getPointFromEvent(event, gestureState);

      return point === null
        ? null
        : getVaultCompositionComponentKeyAtPoint(point.x, point.y, wedges);
    },
    [wedges],
  );

  const finishInteraction = useCallback(() => {
    isInteractingRef.current = false;
    setIsInteracting(false);
    setScrollEnabled?.(true);
  }, [setScrollEnabled]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (event) => getKeyAtEvent(event) !== null,
        onMoveShouldSetPanResponder: () => false,
        onPanResponderGrant: (event, gestureState) => {
          const nextKey = getKeyAtEvent(event, gestureState);

          if (nextKey === null) {
            return;
          }

          isInteractingRef.current = true;
          setIsInteracting(true);
          setScrollEnabled?.(false);
          selectKey(nextKey);
        },
        onPanResponderMove: (event, gestureState) => {
          if (!isInteractingRef.current) {
            return;
          }

          const nextKey = getKeyAtEvent(event, gestureState);
          if (nextKey !== null) {
            selectKey(nextKey);
          }
        },
        onPanResponderRelease: finishInteraction,
        onPanResponderTerminate: finishInteraction,
        onPanResponderTerminationRequest: () => true,
      }),
    [finishInteraction, getKeyAtEvent, selectKey, setScrollEnabled],
  );

  const selectNext = useCallback(() => {
    if (wedgeKeys.length === 0) {
      return;
    }

    const currentIndex = activeKeyRef.current
      ? wedgeKeys.indexOf(activeKeyRef.current)
      : -1;
    const nextIndex = (currentIndex + 1) % wedgeKeys.length;
    selectKey(wedgeKeys[nextIndex]);
  }, [selectKey, wedgeKeys]);

  const selectPrevious = useCallback(() => {
    if (wedgeKeys.length === 0) {
      return;
    }

    const currentIndex = activeKeyRef.current
      ? wedgeKeys.indexOf(activeKeyRef.current)
      : 0;
    const previousIndex =
      (currentIndex - 1 + wedgeKeys.length) % wedgeKeys.length;
    selectKey(wedgeKeys[previousIndex]);
  }, [selectKey, wedgeKeys]);

  return {
    activeKey,
    isInteracting,
    panHandlers: panResponder.panHandlers,
    selectNext,
    selectPrevious,
  };
};

export default useMoneyVaultCompositionChartInteraction;
