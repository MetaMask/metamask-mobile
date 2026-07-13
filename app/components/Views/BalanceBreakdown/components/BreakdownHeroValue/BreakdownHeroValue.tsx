import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  BoxAlignItems,
  BoxJustifyContent,
  FontWeight,
} from '@metamask/design-system-react-native';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { useFormatters } from '../../../../hooks/useFormatters';
import { useSelector } from 'react-redux';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import type { HeroData, SliceData, SliceKey } from '../../types';
import {
  SLICE_LABELS,
  HERO_VALUE_COUNT_DURATION_MS,
  HERO_VALUE_FADE_IN_MS,
  HERO_VALUE_FADE_OFFSET_Y,
  HERO_VALUE_FADE_OUT_MS,
} from '../../constants';
import { BalanceBreakdownTestIds } from '../../BalanceBreakdown.testIds';
import { getPrivacyMaskText } from '../../utils/privacyMask';
import { breakdownHeroValueStyles, breakdownHeroValueSkeletonBoundedStyle } from './BreakdownHeroValue.styles';

interface Props {
  hero: HeroData;
  selectedSlice: SliceKey | 'all';
  selectedSliceData?: SliceData;
  /**
   * When set (e.g. donut inner width), the main fiat line scales down via
   * `adjustsFontSizeToFit` so long values do not overlap the chart ring.
   */
  maxValueWidth?: number;
}

interface DeltaLine {
  text: string;
  color: (typeof TextColor)[keyof typeof TextColor];
  suffix: string;
}

function formatDelta(
  amount: number,
  percentFraction: number | undefined,
  currency: string,
  formatCurrency: (v: number, c: string) => string,
): { text: string; isPositive: boolean } {
  const amtSign = amount >= 0 ? '+' : '-';
  const pctRaw = (percentFraction ?? 0) * 100;
  const pctStr = pctRaw.toFixed(2);
  return {
    text: `${amtSign}${formatCurrency(Math.abs(amount), currency)} (${pctStr}%)`,
    isPositive: amount >= 0,
  };
}

function buildDeltaDisplay(
  supplementalPnl: string | undefined,
  activeDelta: HeroData['delta'] | SliceData['delta'],
  userCurrency: string,
  formatCurrency: (v: number, c: string) => string,
): DeltaLine | null {
  if (supplementalPnl) {
    const t = supplementalPnl.trim();
    return {
      text: t,
      color:
        t.startsWith('+')
          ? TextColor.SuccessDefault
          : t.startsWith('-')
            ? TextColor.ErrorDefault
            : TextColor.TextAlternative,
      suffix: '',
    };
  }
  if (!activeDelta) {
    return null;
  }
  const info = formatDelta(
    activeDelta.amount,
    activeDelta.percent,
    userCurrency,
    formatCurrency,
  );
  const suffix =
    activeDelta.label && activeDelta.label !== '24h'
      ? ` (${activeDelta.label})`
      : '';
  return {
    text: info.text,
    color: info.isPositive
      ? TextColor.SuccessDefault
      : TextColor.ErrorDefault,
    suffix,
  };
}

const BreakdownHeroValue: React.FC<Props> = ({
  hero,
  selectedSlice,
  selectedSliceData,
  maxValueWidth,
}) => {
  const { formatCurrency } = useFormatters();
  const privacyMode = useSelector(selectPrivacyMode);

  const isLoading = hero.status === 'loading';

  const displayValue =
    selectedSlice !== 'all' && selectedSliceData
      ? selectedSliceData.valueFiat
      : hero.totalFiat;

  const displayLabel =
    selectedSlice !== 'all' && selectedSliceData
      ? SLICE_LABELS[selectedSlice]
      : 'TOTAL BALANCE';

  const activeDelta =
    selectedSlice !== 'all' && selectedSliceData
      ? selectedSliceData.delta
      : hero.delta;

  const supplementalPnl = selectedSliceData?.heroSupplementalPnlText;

  const deltaDisplay = useMemo(
    () =>
      buildDeltaDisplay(
        supplementalPnl,
        activeDelta,
        hero.userCurrency,
        formatCurrency,
      ),
    [supplementalPnl, activeDelta, hero.userCurrency, formatCurrency],
  );

  const [committedLabel, setCommittedLabel] = useState(displayLabel);
  const [committedDelta, setCommittedDelta] = useState(deltaDisplay);
  const [displayedAmount, setDisplayedAmount] = useState(displayValue);

  const fadeOpacity = useRef(new Animated.Value(1)).current;
  const fadeTy = useRef(new Animated.Value(0)).current;

  const prevSliceForAnimRef = useRef<SliceKey | 'all' | null>(null);
  const heroFadingRef = useRef(false);
  const displayedAmountRef = useRef(displayValue);
  const countGenRef = useRef(0);
  const countRafRef = useRef<number | null>(null);

  const propsRef = useRef({
    displayLabel,
    displayValue,
    deltaDisplay,
    selectedSlice,
  });

  propsRef.current = {
    displayLabel,
    displayValue,
    deltaDisplay,
    selectedSlice,
  };

  useEffect(() => {
    displayedAmountRef.current = displayedAmount;
  }, [displayedAmount]);

  const runCountAnimation = useCallback((from: number, to: number) => {
    if (process.env.NODE_ENV === 'test') {
      setDisplayedAmount(to);
      displayedAmountRef.current = to;
      return;
    }
    if (Math.abs(to - from) < 1e-9) {
      setDisplayedAmount(to);
      displayedAmountRef.current = to;
      return;
    }
    countGenRef.current += 1;
    const gen = countGenRef.current;
    if (countRafRef.current !== null) {
      cancelAnimationFrame(countRafRef.current);
      countRafRef.current = null;
    }
    const start = Date.now();
    const duration = HERO_VALUE_COUNT_DURATION_MS;
    const tick = () => {
      if (gen !== countGenRef.current) {
        return;
      }
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const v = from + (to - from) * eased;
      setDisplayedAmount(v);
      if (t < 1) {
        countRafRef.current = requestAnimationFrame(tick);
      } else {
        countRafRef.current = null;
        setDisplayedAmount(to);
        displayedAmountRef.current = to;
      }
    };
    countRafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(
    () => () => {
      countGenRef.current += 1;
      if (countRafRef.current !== null) {
        cancelAnimationFrame(countRafRef.current);
      }
    },
    [],
  );

  useLayoutEffect(() => {
    if (isLoading || privacyMode) {
      heroFadingRef.current = false;
      fadeOpacity.stopAnimation();
      fadeTy.stopAnimation();
      fadeOpacity.setValue(1);
      fadeTy.setValue(0);
      countGenRef.current += 1;
      setDisplayedAmount(displayValue);
      displayedAmountRef.current = displayValue;
      setCommittedLabel(displayLabel);
      setCommittedDelta(deltaDisplay);
      prevSliceForAnimRef.current = selectedSlice;
      return;
    }

    if (prevSliceForAnimRef.current === null) {
      prevSliceForAnimRef.current = selectedSlice;
      setDisplayedAmount(displayValue);
      displayedAmountRef.current = displayValue;
      setCommittedLabel(displayLabel);
      setCommittedDelta(deltaDisplay);
      return;
    }

    if (heroFadingRef.current) {
      return;
    }

    const sliceChanged = prevSliceForAnimRef.current !== selectedSlice;

    if (!sliceChanged) {
      setCommittedLabel(displayLabel);
      setCommittedDelta(deltaDisplay);
      const cur = displayValue;
      if (Math.abs(cur - displayedAmountRef.current) > 0.005) {
        runCountAnimation(displayedAmountRef.current, cur);
      }
      return;
    }

    const fromAmt = displayedAmountRef.current;
    heroFadingRef.current = true;
    fadeOpacity.stopAnimation();
    fadeTy.stopAnimation();

    Animated.parallel([
      Animated.timing(fadeOpacity, {
        toValue: 0,
        duration: HERO_VALUE_FADE_OUT_MS,
        useNativeDriver: true,
      }),
      Animated.timing(fadeTy, {
        toValue: -HERO_VALUE_FADE_OFFSET_Y,
        duration: HERO_VALUE_FADE_OUT_MS,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) {
        heroFadingRef.current = false;
        return;
      }
      const p = propsRef.current;
      setCommittedLabel(p.displayLabel);
      setCommittedDelta(p.deltaDisplay);
      fadeOpacity.setValue(0);
      fadeTy.setValue(HERO_VALUE_FADE_OFFSET_Y);
      runCountAnimation(fromAmt, p.displayValue);
      Animated.parallel([
        Animated.timing(fadeOpacity, {
          toValue: 1,
          duration: HERO_VALUE_FADE_IN_MS,
          useNativeDriver: true,
        }),
        Animated.timing(fadeTy, {
          toValue: 0,
          duration: HERO_VALUE_FADE_IN_MS,
          useNativeDriver: true,
        }),
      ]).start(({ finished: fadeInDone }) => {
        if (fadeInDone) {
          prevSliceForAnimRef.current = p.selectedSlice;
        }
        heroFadingRef.current = false;
      });
    });
  }, [
    selectedSlice,
    displayLabel,
    displayValue,
    deltaDisplay,
    isLoading,
    privacyMode,
    fadeOpacity,
    fadeTy,
    runCountAnimation,
  ]);

  const formattedValue = formatCurrency(displayedAmount, hero.userCurrency);

  const fadeMotionStyle = useMemo(
    () => ({
      opacity: fadeOpacity,
      transform: [{ translateY: fadeTy }],
    }),
    [fadeOpacity, fadeTy],
  );

  const heroAmountDisplay = privacyMode
    ? getPrivacyMaskText('long')
    : formattedValue;

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
    >
      <Animated.View
        style={[breakdownHeroValueStyles.fadeBand, fadeMotionStyle]}
      >
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          fontWeight={FontWeight.Medium}
        >
          {committedLabel.toUpperCase()}
        </Text>
      </Animated.View>

      <Skeleton
        hideChildren={isLoading}
        style={
          [
            breakdownHeroValueStyles.skeletonValue,
            maxValueWidth != null
              ? breakdownHeroValueSkeletonBoundedStyle(maxValueWidth)
              : undefined,
          ] as React.ComponentProps<typeof Skeleton>['style']
        }
      >
        <Text
          variant={TextVariant.DisplayMd}
          testID={BalanceBreakdownTestIds.HERO_TOTAL}
          style={
            maxValueWidth != null
              ? breakdownHeroValueStyles.valueAmountFit
              : undefined
          }
          numberOfLines={maxValueWidth != null ? 1 : undefined}
          adjustsFontSizeToFit={maxValueWidth != null}
          minimumFontScale={maxValueWidth != null ? 0.32 : undefined}
        >
          {heroAmountDisplay}
        </Text>
      </Skeleton>

      {committedDelta ? (
        <Animated.View
          style={[breakdownHeroValueStyles.fadeBand, fadeMotionStyle]}
        >
          <Skeleton
            hideChildren={isLoading}
            style={breakdownHeroValueStyles.skeletonDelta}
          >
            <Text
              variant={TextVariant.BodyXs}
              color={committedDelta.color}
              testID={BalanceBreakdownTestIds.HERO_DELTA}
            >
              {privacyMode
                ? getPrivacyMaskText('medium')
                : `${committedDelta.text}${committedDelta.suffix}`}
            </Text>
          </Skeleton>
        </Animated.View>
      ) : null}
    </Box>
  );
};

export default BreakdownHeroValue;
