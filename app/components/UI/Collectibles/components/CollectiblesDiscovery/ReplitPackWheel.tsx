import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Pressable,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  type NativeGesture,
} from 'react-native-gesture-handler';
import { Box } from '@metamask/design-system-react-native';
import type { CollectiblesPack } from '../../types';
import { CollectiblesCarouselTestIds } from '../../Collectibles.testIds';
import { getCollectiblesPackArtwork } from '../../constants/packArtwork';
import { NativePackFoil } from './NativePackFoil';
import { PackHeroArtwork } from './PackHeroArtwork';
import type { PackHeroSource } from './PackHeroFlight.geometry';
import type { PackPresentationPose } from '../CollectiblesMotion/CollectiblesMotion.types';

import {
  REPLIT_WHEEL,
  wrapWheelIndex as wrap,
  wheelRelativeDistance as relative,
  wheelScale,
  wheelOpacity,
  wheelRotation,
  wheelGestureTarget,
} from './ReplitPackWheel.motion';

/** Replit's direct-manipulation wheel, preserving its spring, perspective and float. */
export default function ReplitPackWheel({
  packs,
  animate,
  active,
  onSelect,
  onOpen,
  initialIndex = 0,
  height,
  slotRatio = REPLIT_WHEEL.slotRatio,
  scrollGesture,
}: {
  packs: CollectiblesPack[];
  animate: boolean;
  active: boolean;
  onSelect: (index: number) => void;
  onOpen?: (pack: CollectiblesPack, source?: PackHeroSource) => void;
  initialIndex?: number;
  height?: number;
  slotRatio?: number;
  scrollGesture: NativeGesture;
}) {
  const tw = useTailwind();
  const { width } = useWindowDimensions();
  const stageHeight = height ?? width * 0.9 + 20;
  const artworkHeight = Math.min(stageHeight * 0.92, width * 1.4);
  const progress = useRef(new Animated.Value(initialIndex)).current;
  const carriers = useRef(new Map<string, View>());
  const opening = useRef(false);
  const pausedPoses = useRef(new Map<string, PackPresentationPose>());
  const captureTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const pendingCapture = useRef<
    | {
        packCode: string;
        finish: (pose?: PackPresentationPose) => void;
        timeout: ReturnType<typeof setTimeout>;
      }
    | undefined
  >(undefined);
  const [capture, setCapture] = useState<{ packCode: string; id: number }>();
  const captureSequence = useRef(0);
  const didDrag = useRef(false);
  const cancelCapture = useCallback(() => {
    if (pendingCapture.current) clearTimeout(pendingCapture.current.timeout);
    pendingCapture.current = undefined;
  }, []);
  useEffect(
    () => () => {
      if (captureTimeout.current) clearTimeout(captureTimeout.current);
      cancelCapture();
    },
    [cancelCapture],
  );
  const current = useRef(initialIndex);
  const start = useRef(initialIndex);
  const dragging = useRef(false);
  const dragSession = useRef(0);
  const latestDx = useRef(0);
  const [index, setIndex] = useState(initialIndex);
  const [foreground, setForeground] = useState(
    AppState.currentState === 'active',
  );
  const [reduced, setReduced] = useState(false);
  const motion = animate && active && foreground && !reduced;
  const count = packs.length;
  const slot = width * slotRatio;
  const syncSelection = useCallback(
    (value: number) => {
      current.current = value;
      const next = wrap(Math.round(value), count);
      setIndex(next);
      onSelect(next);
    },
    [count, onSelect],
  );
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduced(value);
      })
      .catch(() => undefined);
    const accessibility = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    );
    const appState = AppState.addEventListener('change', (value) =>
      setForeground(value === 'active'),
    );
    return () => {
      mounted = false;
      accessibility.remove();
      appState.remove();
    };
  }, []);
  useEffect(() => {
    const listener = progress.addListener(({ value }) => {
      // Native spring ticks can arrive after a new drag has already stopped it.
      if (!dragging.current) syncSelection(value);
    });
    return () => {
      dragging.current = false;
      dragSession.current += 1;
      progress.removeListener(listener);
      progress.stopAnimation();
    };
  }, [progress, syncSelection]);
  useEffect(() => {
    if (active) {
      opening.current = false;
      didDrag.current = false;
    } else {
      cancelCapture();
      dragging.current = false;
      dragSession.current += 1;
      progress.stopAnimation();
    }
  }, [active, cancelCapture, progress]);
  const open = (pack: CollectiblesPack, pose?: PackPresentationPose) => {
    if (opening.current || !onOpen) return;
    opening.current = true;
    if (pose) pausedPoses.current.set(pack.code, pose);
    const carrier = carriers.current.get(pack.code);
    if (!motion || !carrier) {
      onOpen(pack);
      return;
    }
    let completed = false;
    const finish = (source?: PackHeroSource) => {
      if (completed) return;
      completed = true;
      if (captureTimeout.current) clearTimeout(captureTimeout.current);
      onOpen(pack, source);
    };
    captureTimeout.current = setTimeout(() => finish(), 100);
    carrier.measureInWindow((left, top, measuredWidth, measuredHeight) => {
      finish(
        measuredWidth > 0 && measuredHeight > 0
          ? {
              packCode: pack.code,
              rect: { left, top, width: measuredWidth, height: measuredHeight },
              transform: pose?.transform ?? 'none',
              time: pose?.time ?? 0,
            }
          : undefined,
      );
    });
  };
  const requestOpen = (pack: CollectiblesPack) => {
    if (
      didDrag.current ||
      opening.current ||
      pendingCapture.current ||
      !active ||
      !onOpen
    )
      return;
    if (!motion) {
      open(pack);
      return;
    }
    const finish = (pose?: PackPresentationPose) => {
      if (pendingCapture.current?.packCode !== pack.code) return;
      cancelCapture();
      open(pack, pose);
    };
    pendingCapture.current = {
      packCode: pack.code,
      finish,
      timeout: setTimeout(() => finish(), 100),
    };
    // The native press owns the touch; the visual-only WebView captures its float pose.
    setCapture({ packCode: pack.code, id: ++captureSequence.current });
  };
  const settle = useCallback(
    (target: number, velocity = 0) => {
      progress.stopAnimation();
      if (!motion) {
        current.current = wrap(target, count);
        progress.setValue(current.current);
        return;
      }
      Animated.spring(progress, {
        toValue: target,
        stiffness: REPLIT_WHEEL.stiffness,
        damping: REPLIT_WHEEL.damping,
        mass: 1,
        restDisplacementThreshold: REPLIT_WHEEL.restDelta,
        velocity,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          current.current = wrap(target, count);
          progress.setValue(current.current);
        }
      });
    },
    [count, motion, progress],
  );
  // Native arbitration happens before the ancestor ScrollView can start moving.
  // A vertical intent fails this pan; an active horizontal pan blocks page scroll
  // until release/cancellation, even if the finger subsequently drifts vertically.
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .withTestId(CollectiblesCarouselTestIds.PAN)
        .runOnJS(true)
        .enabled(active && count > 1)
        .activeOffsetX([-8, 8])
        .failOffsetY([-8, 8])
        .blocksExternalGesture(scrollGesture)
        .onBegin(() => {
          didDrag.current = false;
        })
        .onStart((event) => {
          didDrag.current = true;
          cancelCapture();
          const session = ++dragSession.current;
          dragging.current = true;
          latestDx.current = event.translationX;
          start.current = wrap(current.current, count);
          progress.stopAnimation((value) => {
            if (!dragging.current || dragSession.current !== session) return;
            // Preserve moves received while the interrupted native spring stops.
            start.current = wrap(value, count);
            const next = start.current - latestDx.current / slot;
            syncSelection(next);
            progress.setValue(next);
          });
        })
        .onUpdate((event) => {
          latestDx.current = event.translationX;
          const next = start.current - event.translationX / slot;
          syncSelection(next);
          progress.setValue(next);
        })
        .onEnd((event, success) => {
          dragging.current = false;
          const velocity = success ? -event.velocityX / slot : 0;
          settle(
            success
              ? wheelGestureTarget(
                  Math.round(start.current),
                  current.current,
                  velocity,
                )
              : Math.round(current.current),
            velocity,
          );
        })
        .onFinalize(() => {
          if (!dragging.current) return;
          dragging.current = false;
          settle(Math.round(current.current));
        }),
    [
      active,
      cancelCapture,
      count,
      progress,
      scrollGesture,
      settle,
      slot,
      syncSelection,
    ],
  );
  const inputRange = useMemo(
    () =>
      Array.from({ length: (count + 4) * 20 + 1 }, (_, step) => -2 + step / 20),
    [count],
  );
  // Preserve the native animation graph when selection changes. Replacing its
  // nodes mid-drag restores the previous AnimatedProps before reconnecting.
  const itemMotion = useMemo(
    () =>
      Array.from({ length: count }, (_, itemIndex) => {
        const deltas = inputRange.map((value) =>
          relative(itemIndex, value, count),
        );
        return {
          opacity: progress.interpolate({
            inputRange,
            outputRange: deltas.map(wheelOpacity),
          }),
          translateX: progress.interpolate({
            inputRange,
            outputRange: deltas.map((value) => value * slot),
          }),
          scale: progress.interpolate({
            inputRange,
            outputRange: deltas.map(wheelScale),
          }),
          rotateY: progress.interpolate({
            inputRange,
            outputRange: deltas.map(wheelRotation),
          }),
        };
      }),
    [count, inputRange, progress, slot],
  );
  return (
    <GestureDetector gesture={pan}>
      <Box
        testID={CollectiblesCarouselTestIds.WHEEL}
        style={{ height: stageHeight }}
        twClassName="w-full overflow-hidden"
      >
        {packs.map((pack, itemIndex) => {
          const itemAnimation = itemMotion[itemIndex];
          const artwork = getCollectiblesPackArtwork(
            `pack_partner:${pack.code}`,
          );
          return (
            <Animated.View
              key={pack.code}
              style={tw.style('absolute', {
                width: width * 0.62,
                height: artworkHeight,
                top: (stageHeight - artworkHeight) / 2,
                left: width * 0.19,
                zIndex: itemIndex === index ? 10 : 8,
                opacity: itemAnimation.opacity,
                transform: [
                  { perspective: REPLIT_WHEEL.perspective },
                  { translateX: itemAnimation.translateX },
                  { scale: itemAnimation.scale },
                  { rotateY: itemAnimation.rotateY },
                ],
              })}
            >
              <View
                ref={(view) => {
                  if (view) carriers.current.set(pack.code, view);
                  else carriers.current.delete(pack.code);
                }}
                collapsable={false}
                style={tw.style('self-center', {
                  width: artworkHeight * 0.6,
                  height: artworkHeight,
                })}
              >
                <Pressable
                  pointerEvents="box-only"
                  style={tw.style('w-full h-full')}
                  accessibilityRole="button"
                  accessibilityLabel={artwork.name ?? pack.name}
                  disabled={!active}
                  testID={`collectibles-hero-pack-${pack.code}`}
                  onPressIn={() => {
                    didDrag.current = false;
                  }}
                  onPress={() => {
                    if (didDrag.current) return;
                    if (itemIndex === index) requestOpen(pack);
                    else
                      settle(
                        Math.round(
                          current.current +
                            relative(itemIndex, current.current, count),
                        ),
                      );
                  }}
                >
                  {itemIndex === index && motion ? (
                    <PackHeroArtwork
                      artwork={artwork}
                      name={artwork.name ?? pack.name}
                      height={artworkHeight}
                      active={motion}
                      pose={pausedPoses.current.get(pack.code)}
                      pointerEvents="none"
                      captureId={
                        capture?.packCode === pack.code ? capture.id : undefined
                      }
                      onPress={(pose) => {
                        if (pendingCapture.current?.packCode === pack.code)
                          pendingCapture.current.finish(pose);
                      }}
                    />
                  ) : (
                    <NativePackFoil
                      source={artwork.image}
                      name={artwork.name ?? pack.name}
                      height={artworkHeight}
                    />
                  )}
                </Pressable>
              </View>
            </Animated.View>
          );
        })}
      </Box>
    </GestureDetector>
  );
}
