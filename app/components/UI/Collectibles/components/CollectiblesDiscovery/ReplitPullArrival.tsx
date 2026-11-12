import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import RarityArtworkSurface from '../CardDisplay/RarityArtworkSurface';
import type { CollectiblesInventoryCard } from '../../types';
import CardImage from '../CardImage';

/** Exact keyframes/timings from Replit components/gacha/PackPullActivity.css. */
export const REPLIT_PULL_ARRIVAL = {
  enterMs: 360,
  turnDelayMs: 380,
  turnMs: 620,
  copyDelayMs: 1020,
  copyMs: 240,
} as const;

/** CollectiblesDiscoveryCard.tsx requires a loaded, real back artwork before applying the sequence. */
export default function ReplitPullArrival({
  identity,
  active,
  backImage,
  artwork,
  rarity,
  children,
}: {
  identity?: string;
  active: boolean;
  backImage?: string;
  artwork: React.ReactNode;
  rarity?: CollectiblesInventoryCard['rarity'];
  children: React.ReactNode;
}) {
  const tw = useTailwind();
  const enter = useRef(new Animated.Value(1)).current;
  const turn = useRef(new Animated.Value(1)).current;
  const copy = useRef(new Animated.Value(1)).current;
  const lastAnimated = useRef<string | undefined>(undefined);
  const [readyBack, setReadyBack] = useState<string>();
  useEffect(() => {
    if (!identity || !active || !backImage) return;
    let cancelled = false;
    Image.prefetch(backImage, { cachePolicy: 'memory-disk' })
      .then((ready) => {
        if (ready && !cancelled) setReadyBack(backImage);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [identity, active, backImage]);
  useEffect(() => {
    if (
      !identity ||
      !active ||
      !backImage ||
      readyBack !== backImage ||
      lastAnimated.current === identity
    )
      return;
    lastAnimated.current = identity;
    enter.setValue(0);
    turn.setValue(0);
    copy.setValue(0);
    const animation = Animated.parallel([
      Animated.timing(enter, {
        toValue: 1,
        duration: REPLIT_PULL_ARRIVAL.enterMs,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(REPLIT_PULL_ARRIVAL.turnDelayMs),
        Animated.timing(turn, {
          toValue: 1,
          duration: REPLIT_PULL_ARRIVAL.turnMs,
          easing: Easing.bezier(0.32, 0.72, 0, 1),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(REPLIT_PULL_ARRIVAL.copyDelayMs),
        Animated.timing(copy, {
          toValue: 1,
          duration: REPLIT_PULL_ARRIVAL.copyMs,
          easing: Easing.bezier(0, 0, 0.58, 1),
          useNativeDriver: true,
        }),
      ]),
    ]);
    animation.start();
    return () => {
      animation.stop();
      enter.setValue(1);
      turn.setValue(1);
      copy.setValue(1);
    };
  }, [identity, active, backImage, readyBack, enter, turn, copy]);
  return (
    <Animated.View
      style={tw.style('flex-1', {
        opacity: enter,
        transform: [
          {
            translateX: enter.interpolate({
              inputRange: [0, 1],
              outputRange: [-64, 0],
            }),
          },
          {
            scale: enter.interpolate({
              inputRange: [0, 1],
              outputRange: [0.9, 1],
            }),
          },
        ],
      })}
    >
      <Box>
        <RarityArtworkSurface rarity={rarity}>
          <Box>
            <Animated.View
              style={tw.style({
                backfaceVisibility: 'hidden',
                transform: [
                  { perspective: 900 },
                  {
                    rotateY: turn.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['180deg', '0deg'],
                    }),
                  },
                ],
              })}
            >
              {artwork}
            </Animated.View>
            {backImage && readyBack === backImage && (
              <Animated.View
                pointerEvents="none"
                accessible={false}
                style={tw.style('absolute inset-0', {
                  backfaceVisibility: 'hidden',
                  transform: [
                    { perspective: 900 },
                    {
                      rotateY: turn.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['360deg', '180deg'],
                      }),
                    },
                  ],
                })}
              >
                <CardImage
                  uri={backImage}
                  aspectRatio={2 / 3}
                  transparent
                  roundedClassName="rounded-none"
                />
              </Animated.View>
            )}
          </Box>
        </RarityArtworkSurface>
        <Animated.View
          style={tw.style({
            opacity: copy,
            transform: [
              {
                translateY: copy.interpolate({
                  inputRange: [0, 1],
                  outputRange: [6, 0],
                }),
              },
            ],
          })}
        >
          {children}
        </Animated.View>
      </Box>
    </Animated.View>
  );
}
