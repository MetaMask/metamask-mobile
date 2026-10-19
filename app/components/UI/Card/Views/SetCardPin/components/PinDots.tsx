import React, { useLayoutEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { PIN_LENGTH } from '../validatePin';
import { SetCardPinSelectors } from '../SetCardPin.testIds';

interface PinDotsProps {
  value: string;
  revealedIndex: number | null;
  isError?: boolean;
}

const DOT_SIZE = 16;
const SLOT_SIZE = 24;
const FILL_FADE_OUT_MS = 180;

type FadeKind = 'fill' | 'digit';

const styles = StyleSheet.create({
  slot: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
  },
  emptyOutlineAbsolute: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    left: (SLOT_SIZE - DOT_SIZE) / 2,
    top: (SLOT_SIZE - DOT_SIZE) / 2,
  },
  overlay: {
    alignItems: 'center',
    justifyContent: 'center',
    width: SLOT_SIZE,
    height: SLOT_SIZE,
  },
});

const PinDotSlot: React.FC<{
  filled: boolean;
  revealedDigit: string | null;
  isError: boolean;
}> = ({ filled, revealedDigit, isError }) => {
  const occupied = filled || revealedDigit != null;

  // Delete/clear animation only. Digit ↔ fill is derived from props (instant).
  const [fading, setFading] = useState<FadeKind | null>(null);
  const [fadeDigit, setFadeDigit] = useState<string | null>(null);
  // useState lazy init so React Compiler can optimize (useRef(...).current
  // during render is a Rules-of-React violation).
  const [fillOpacity] = useState(() => new Animated.Value(1));
  const [wasOccupied, setWasOccupied] = useState(occupied);
  const [lastDigit, setLastDigit] = useState<string | null>(revealedDigit);
  const [lastKind, setLastKind] = useState<FadeKind | null>(
    revealedDigit != null ? 'digit' : filled ? 'fill' : null,
  );
  const [lastIsError, setLastIsError] = useState(isError);
  const fadeAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  useLayoutEffect(() => {
    if (occupied) {
      fadeAnimationRef.current?.stop();
      fadeAnimationRef.current = null;
      setFading(null);
      setFadeDigit(null);
      fillOpacity.setValue(1);
      setWasOccupied(true);
      setLastIsError(isError);
      if (revealedDigit != null) {
        setLastDigit(revealedDigit);
        setLastKind('digit');
      } else if (filled) {
        setLastKind('fill');
      }
      return;
    }

    if (!wasOccupied || fading != null) {
      return;
    }

    // Occupied → empty (single delete, long-press clear, or error reset):
    // keep fill/digit over the empty ring and fade only that overlay.
    setWasOccupied(false);
    const kind = lastKind ?? 'fill';
    setFadeDigit(kind === 'digit' ? lastDigit : null);
    setFading(kind);
    fillOpacity.setValue(1);

    const animation = Animated.timing(fillOpacity, {
      toValue: 0,
      duration: FILL_FADE_OUT_MS,
      useNativeDriver: true,
    });
    fadeAnimationRef.current = animation;
    animation.start(({ finished }) => {
      if (!finished) {
        return;
      }
      setFading(null);
      setFadeDigit(null);
      fillOpacity.setValue(1);
      fadeAnimationRef.current = null;
    });
  }, [
    occupied,
    fading,
    fillOpacity,
    wasOccupied,
    lastKind,
    lastDigit,
    revealedDigit,
    filled,
    isError,
  ]);

  // First render after a clear still has wasOccupied=true before layout
  // effect runs — treat that as an in-progress fade so we never paint empty-only.
  const pendingFadeKind: FadeKind | null =
    !occupied && wasOccupied && fading == null ? (lastKind ?? 'fill') : null;
  const activeFade = fading ?? pendingFadeKind;
  const paintError = activeFade != null ? lastIsError : isError;

  const colorClass = paintError ? 'bg-error-default' : 'bg-icon-default';
  const borderClass = paintError
    ? 'border-error-default'
    : 'border-icon-default';
  const digitColorClass = paintError ? 'text-error-default' : 'text-default';

  const showDigit = revealedDigit != null || activeFade === 'digit';
  const showFill = (filled && revealedDigit == null) || activeFade === 'fill';
  const showEmptyOutline =
    (!occupied && activeFade == null) || activeFade != null;

  const digitOverlayStyle = [
    styles.overlay,
    { opacity: activeFade === 'digit' ? fillOpacity : 1 },
  ];
  const fillOverlayStyle = [
    styles.overlay,
    { opacity: activeFade === 'fill' ? fillOpacity : 1 },
  ];

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      style={styles.slot}
    >
      {showEmptyOutline ? (
        <Box
          twClassName={`rounded-full border-2 ${borderClass}`}
          style={activeFade == null ? styles.dot : styles.emptyOutlineAbsolute}
        />
      ) : null}

      {showDigit ? (
        <Animated.View style={digitOverlayStyle}>
          <Text variant={TextVariant.HeadingMd} twClassName={digitColorClass}>
            {revealedDigit ?? fadeDigit ?? lastDigit}
          </Text>
        </Animated.View>
      ) : null}

      {showFill ? (
        <Animated.View style={fillOverlayStyle}>
          <Box twClassName={`rounded-full ${colorClass}`} style={styles.dot} />
        </Animated.View>
      ) : null}
    </Box>
  );
};

const PinDots: React.FC<PinDotsProps> = ({
  value,
  revealedIndex,
  isError = false,
}) => (
  <Box
    testID={SetCardPinSelectors.PIN_DOTS}
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Center}
    gap={4}
  >
    {Array.from({ length: PIN_LENGTH }, (_, index) => {
      const digit = value[index] ?? null;
      const isRevealed = revealedIndex === index && digit != null;
      return (
        <PinDotSlot
          key={index}
          filled={digit != null && !isRevealed}
          revealedDigit={isRevealed ? digit : null}
          isError={isError}
        />
      );
    })}
  </Box>
);

export default PinDots;
