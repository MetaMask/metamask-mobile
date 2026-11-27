import {
  type ComponentProps,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  RiveView,
  useRive,
  useRiveFile,
  useViewModelInstance,
  type RiveError,
  type ViewModelBooleanProperty,
  type ViewModelNumberProperty,
} from '@rive-app/react-native';
import { type SharedValue, useSharedValue } from 'react-native-reanimated';
import PullRefreshAnimation from '../../../../../animations/pull_refresh.riv';
import Logger from '../../../../../util/Logger';
import {
  RIVE_ARTBOARD_NAME,
  RIVE_IS_PULLING_PATH,
  RIVE_IS_REFRESHING_PATH,
  RIVE_PULL_PROGRESS_PATH,
  clamp,
} from './pullToRefreshConstants';

interface UsePullToRefreshRiveOptions {
  enabled: boolean;
  pullDistance: SharedValue<number>;
}

type RiveHookResult = ReturnType<typeof useRive>;
type RiveFileHookResult = ReturnType<typeof useRiveFile>;
type RiveViewProps = ComponentProps<typeof RiveView>;

interface UsePullToRefreshRiveResult {
  canRenderRive: boolean;
  bindingReady: boolean;
  instance: RiveViewProps['dataBind'] | null;
  riveFile: RiveFileHookResult['riveFile'];
  riveReadyShared: SharedValue<boolean>;
  riveViewRef: RiveHookResult['riveViewRef'];
  setHybridRef: RiveHookResult['setHybridRef'];
  handleRiveError: (riveError: RiveError) => void;
  writeRivePulling: (value: boolean) => void;
  writeRiveProgress: (value: number) => void;
  writeRiveRefreshing: (value: boolean) => void;
}

export const usePullToRefreshRive = ({
  enabled,
  pullDistance,
}: UsePullToRefreshRiveOptions): UsePullToRefreshRiveResult => {
  const pullDistanceShared = pullDistance;
  const [hasRiveError, setHasRiveError] = useState(false);
  const [bindingReady, setBindingReady] = useState(false);
  const { riveFile, error: riveFileError } = useRiveFile(
    enabled ? PullRefreshAnimation : undefined,
  );
  const { instance, error: instanceError } = useViewModelInstance(riveFile, {
    artboardName: RIVE_ARTBOARD_NAME,
    async: true,
  });
  const { riveViewRef, setHybridRef } = useRive();

  const riveReadyShared = useSharedValue(false);
  const isPullingPropertyRef = useRef<ViewModelBooleanProperty | null>(null);
  const isRefreshingPropertyRef = useRef<ViewModelBooleanProperty | null>(null);
  const pullProgressPropertyRef = useRef<ViewModelNumberProperty | null>(null);
  const lastProgressRef = useRef<number | null>(null);

  const handleRiveError = useCallback(
    (riveError: RiveError) => {
      Logger.error(
        new Error(riveError.message),
        `PullToRefresh: Rive error (${riveError.type})`,
      );
      pullDistanceShared.value = 0;
      riveReadyShared.value = false;
      setBindingReady(false);
      setHasRiveError(true);
    },
    [pullDistanceShared, riveReadyShared],
  );

  useEffect(() => {
    if (riveFileError) {
      Logger.error(
        riveFileError as Error,
        'PullToRefresh: Rive file failed to load',
      );
      pullDistanceShared.value = 0;
      riveReadyShared.value = false;
      setBindingReady(false);
      setHasRiveError(true);
    }

    if (instanceError) {
      Logger.error(
        instanceError as Error,
        'PullToRefresh: Rive View Model failed to load',
      );
      pullDistanceShared.value = 0;
      riveReadyShared.value = false;
      setBindingReady(false);
      setHasRiveError(true);
    }
  }, [instanceError, pullDistanceShared, riveFileError, riveReadyShared]);

  useEffect(() => {
    if (!enabled) {
      pullDistanceShared.value = 0;
      riveReadyShared.value = false;
      setBindingReady(false);
    }
  }, [enabled, pullDistanceShared, riveReadyShared]);

  const canRenderRive =
    enabled &&
    !hasRiveError &&
    !riveFileError &&
    !instanceError &&
    Boolean(riveFile && instance);

  useEffect(() => {
    lastProgressRef.current = null;
    isPullingPropertyRef.current = null;
    isRefreshingPropertyRef.current = null;
    pullProgressPropertyRef.current = null;
    riveReadyShared.value = false;
    setBindingReady(false);

    if (!enabled || !instance || !riveViewRef) {
      return undefined;
    }

    try {
      const isPullingProperty = instance.booleanProperty(RIVE_IS_PULLING_PATH);
      const isRefreshingProperty = instance.booleanProperty(
        RIVE_IS_REFRESHING_PATH,
      );
      const pullProgressProperty = instance.numberProperty(
        RIVE_PULL_PROGRESS_PATH,
      );

      if (
        !isPullingProperty ||
        !isRefreshingProperty ||
        !pullProgressProperty
      ) {
        throw new Error('Required PullToRefresh View Model property missing');
      }

      isPullingPropertyRef.current = isPullingProperty;
      isRefreshingPropertyRef.current = isRefreshingProperty;
      pullProgressPropertyRef.current = pullProgressProperty;
      riveReadyShared.value = true;
      setBindingReady(true);

      return (): void => {
        isPullingPropertyRef.current = null;
        isRefreshingPropertyRef.current = null;
        pullProgressPropertyRef.current = null;
        riveReadyShared.value = false;
        setBindingReady(false);
      };
    } catch (error) {
      handleRiveError({
        message:
          error instanceof Error
            ? error.message
            : 'PullToRefresh View Model binding failed',
        type: 0,
      });
      return undefined;
    }
  }, [enabled, handleRiveError, instance, riveReadyShared, riveViewRef]);

  const writeRivePulling = useCallback(
    (value: boolean) => {
      if (!riveViewRef) {
        return;
      }

      try {
        isPullingPropertyRef.current?.set(value);
      } catch (error) {
        handleRiveError({
          message:
            error instanceof Error
              ? error.message
              : 'PullToRefresh isPulling write failed',
          type: 0,
        });
      }
    },
    [handleRiveError, riveViewRef],
  );

  const writeRiveRefreshing = useCallback(
    (value: boolean) => {
      if (!riveViewRef) {
        return;
      }

      try {
        isRefreshingPropertyRef.current?.set(value);
      } catch (error) {
        handleRiveError({
          message:
            error instanceof Error
              ? error.message
              : 'PullToRefresh isRefreshing write failed',
          type: 0,
        });
      }
    },
    [handleRiveError, riveViewRef],
  );

  const writeRiveProgress = useCallback(
    (value: number) => {
      if (!riveViewRef || lastProgressRef.current === value) {
        return;
      }

      lastProgressRef.current = value;
      try {
        pullProgressPropertyRef.current?.set(clamp(value, 0, 100));
      } catch (error) {
        handleRiveError({
          message:
            error instanceof Error
              ? error.message
              : 'PullToRefresh pullProgress write failed',
          type: 0,
        });
      }
    },
    [handleRiveError, riveViewRef],
  );

  return {
    canRenderRive,
    bindingReady,
    instance,
    riveFile,
    riveReadyShared,
    riveViewRef,
    setHybridRef,
    handleRiveError,
    writeRivePulling,
    writeRiveProgress,
    writeRiveRefreshing,
  };
};
