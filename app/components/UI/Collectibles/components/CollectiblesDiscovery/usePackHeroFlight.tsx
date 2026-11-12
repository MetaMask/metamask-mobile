import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { PackArtwork } from '../../constants/packArtwork';
import type { PackPresentationPose } from '../CollectiblesMotion/CollectiblesMotion.types';
import { NativePackFoil } from './NativePackFoil';
import {
  PACK_HERO_FLIGHT,
  packFlightTransform,
  packFloatMatrix,
  type PackHeroRect,
  type PackHeroSource,
} from './PackHeroFlight.geometry';

interface Flight {
  from: PackHeroRect;
  to: PackHeroRect;
  reverse: boolean;
  pose: PackPresentationPose;
}
/** Native coordinate adapter for Replit PackHeroFlight's single 240ms presentation clock. */
export function usePackHeroFlight({
  source,
  packCode,
  artwork,
  name,
  enabled,
  layoutReady = true,
  onClose,
}: {
  source?: PackHeroSource;
  packCode: string;
  artwork: PackArtwork;
  name: string;
  enabled: boolean;
  /** Wait for native footer layout before capturing the hero destination. */
  layoutReady?: boolean;
  onClose: () => void;
}) {
  const tw = useTailwind();
  const frameRef = useRef<View>(null);
  const destinationRef = useRef<View>(null);
  const rootRect = useRef<PackHeroRect | undefined>(undefined);
  const destination = useRef<PackHeroRect | undefined>(undefined);
  const [flight, setFlight] = useState<Flight>();
  const [captureId, setCaptureId] = useState(0);
  const awaitingClose = useRef(false);
  const captureTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [measuring, setMeasuring] = useState(Boolean(source && enabled));
  const progress = useRef(new Animated.Value(0)).current;
  const progressValue = useRef(0);
  const scrollTop = useRef(0);
  const started = useRef(false);
  const mounted = useRef(true);
  const pendingFrame = useRef<number | undefined>(undefined);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    mounted.current = true;
    const listener = progress.addListener(({ value }) => {
      progressValue.current = value;
    });
    return () => {
      mounted.current = false;
      if (captureTimeout.current) clearTimeout(captureTimeout.current);
      progress.removeListener(listener);
      progress.stopAnimation();
      if (pendingFrame.current) cancelAnimationFrame(pendingFrame.current);
    };
  }, [progress]);
  const begin = useCallback(
    (next: Flight) => {
      progress.stopAnimation();
      progress.setValue(0);
      setMeasuring(false);
      setFlight(next);
      Animated.timing(progress, {
        toValue: 1,
        duration: PACK_HERO_FLIGHT.duration,
        easing: Easing.bezier(...PACK_HERO_FLIGHT.easing),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        setFlight(undefined);
        if (next.reverse) closeRef.current();
      });
    },
    [progress],
  );
  const measure = useCallback(() => {
    if (!layoutReady) return;
    if (
      !source ||
      !enabled ||
      started.current ||
      source.packCode !== packCode
    ) {
      setMeasuring(false);
      return;
    }
    let frames = 0;
    const read = () => {
      if (!mounted.current) return;
      frameRef.current?.measureInWindow((left, top, width, height) => {
        destinationRef.current?.measureInWindow(
          (targetLeft, targetTop, targetWidth, targetHeight) => {
            if (!mounted.current) return;
            if (width <= 0 || height <= 0 || targetHeight <= 0) {
              if (++frames <= 60)
                pendingFrame.current = requestAnimationFrame(read);
              else setMeasuring(false);
              return;
            }
            if (started.current) return;
            started.current = true;
            rootRect.current = { left, top, width, height };
            destination.current = {
              left: targetLeft - left,
              top: targetTop - top,
              width: targetWidth,
              height: targetHeight,
            };
            begin({
              from: {
                ...source.rect,
                left: source.rect.left - left,
                top: source.rect.top - top,
              },
              to: destination.current,
              reverse: false,
              pose: source,
            });
          },
        );
      });
    };
    read();
  }, [source, enabled, layoutReady, packCode, begin]);
  useEffect(() => {
    if (!layoutReady) return undefined;
    // Let native layout apply the measured footer's new hero dimensions before
    // capturing the destination; onLayout also covers later layout changes.
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [layoutReady, measure]);
  useEffect(() => {
    if (!enabled || source?.packCode !== packCode) {
      progress.stopAnimation();
      setMeasuring(false);
      setFlight(undefined);
    }
  }, [enabled, source?.packCode, packCode, progress]);
  const performClose = (pose?: PackPresentationPose) => {
    awaitingClose.current = false;
    if (captureTimeout.current) clearTimeout(captureTimeout.current);
    if (flight?.reverse) return;
    if (
      !enabled ||
      !source ||
      source.packCode !== packCode ||
      scrollTop.current > 0 ||
      !destination.current ||
      !rootRect.current
    ) {
      closeRef.current();
      return;
    }
    const t = progressValue.current;
    const from = flight
      ? {
          left: flight.from.left + (flight.to.left - flight.from.left) * t,
          top: flight.from.top + (flight.to.top - flight.from.top) * t,
          width: flight.from.width + (flight.to.width - flight.from.width) * t,
          height:
            flight.from.height + (flight.to.height - flight.from.height) * t,
        }
      : destination.current;
    begin({
      from,
      to: {
        ...source.rect,
        left: source.rect.left - rootRect.current.left,
        top: source.rect.top - rootRect.current.top,
      },
      reverse: true,
      pose: pose ?? flight?.pose ?? source,
    });
  };
  const close = () => {
    if (
      !flight &&
      enabled &&
      source?.packCode === packCode &&
      scrollTop.current === 0 &&
      destination.current
    ) {
      if (awaitingClose.current) return;
      awaitingClose.current = true;
      setCaptureId((value) => value + 1);
      captureTimeout.current = setTimeout(() => performClose(), 150);
    } else performClose();
  };
  const receivePose = (pose: PackPresentationPose) => {
    if (awaitingClose.current) performClose(pose);
  };
  const transform = flight
    ? packFlightTransform(flight.from, flight.to)
    : undefined;
  const floatMatrix = flight
    ? packFloatMatrix(flight.pose.transform)
    : undefined;
  const destinationFloat = source
    ? packFloatMatrix(source.transform)
    : undefined;
  const sourceAngle = floatMatrix
    ? (Math.atan2(floatMatrix[1], floatMatrix[0]) * 180) / Math.PI
    : 0;
  const targetAngle = destinationFloat
    ? (Math.atan2(destinationFloat[1], destinationFloat[0]) * 180) / Math.PI
    : 0;
  const overlay =
    flight && transform && source ? (
      <Animated.View
        pointerEvents="none"
        style={tw.style('absolute z-50', {
          left: flight.from.left,
          top: flight.from.top,
          width: flight.from.width,
          height: flight.from.height,
          transformOrigin: 'top left',
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, transform.translateX],
              }),
            },
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, transform.translateY],
              }),
            },
            {
              scaleX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [1, transform.scaleX],
              }),
            },
            {
              scaleY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [1, transform.scaleY],
              }),
            },
          ],
        })}
        testID="collectibles-pack-hero-flight"
      >
        <Animated.View
          style={{
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [
                    floatMatrix?.[13] ?? 0,
                    flight.reverse && destinationFloat
                      ? (destinationFloat[13] * flight.from.height) /
                        flight.to.height
                      : (floatMatrix?.[13] ?? 0),
                  ],
                }),
              },
              {
                rotate: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [
                    `${sourceAngle}deg`,
                    `${flight.reverse ? targetAngle : sourceAngle}deg`,
                  ],
                }),
              },
            ],
          }}
        >
          <NativePackFoil
            source={artwork.image}
            name={name}
            height={flight.from.height}
          />
        </Animated.View>
      </Animated.View>
    ) : null;
  const contentOpacity = measuring
    ? 0
    : flight
      ? flight.reverse
        ? progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
        : progress
      : 1;
  const onFrameLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (
      rootRect.current &&
      (Math.abs(rootRect.current.width - width) > 1 ||
        Math.abs(rootRect.current.height - height) > 1)
    ) {
      progress.stopAnimation();
      setMeasuring(false);
      setFlight(undefined);
      if (flight?.reverse) closeRef.current();
    }
  };
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollTop.current = Math.max(0, event.nativeEvent.contentOffset.y);
  };
  return {
    captureId,
    receivePose,
    frameRef,
    destinationRef,
    onFrameLayout,
    measure,
    close,
    onScroll,
    overlay,
    contentOpacity,
    hidden: measuring || Boolean(flight),
    pose: source,
  };
}
