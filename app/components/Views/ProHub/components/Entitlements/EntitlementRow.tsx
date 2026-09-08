import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconSize,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type {
  EntitlementAction,
  EntitlementAllowance,
  HubBenefitRow,
} from '../../../shared/pro/entitlements.constants';
import {
  ORANGE_SWEEP_ORANGE,
  ORANGE_SWEEP_VIOLET,
} from '../../../shared/pro/brand.constants';
import { ENTITLEMENT_INTRO } from './Entitlements.constants';
import { EntitlementsTestIds } from './Entitlements.testIds';

interface EntitlementRowProps {
  row: HubBenefitRow;
  onAction: (action: EntitlementAction) => void;
  /** When this row fades in. */
  entranceDelayMs: number;
  /** When its bar starts depleting — after every row has arrived. */
  barDelayMs: number;
}

/*
 * Orange leads at the left edge, which the bar always keeps as it drains in
 * from the right — so the colour at a given point on the track is the same on
 * every row. Pink-first would make a quarter-full bar and a three-quarter-full
 * one read as different colours.
 */
const BAR_COLORS = [ORANGE_SWEEP_ORANGE, ORANGE_SWEEP_VIOLET];
const BAR_GRADIENT_START = { x: 0, y: 0 };
const BAR_GRADIENT_END = { x: 1, y: 0 };
/* Floor for the clip share, so a fully spent allowance cannot divide by zero. */
const MIN_VISIBLE_FRACTION = 0.001;

const styles = StyleSheet.create({
  barFill: {
    height: '100%',
    overflow: 'hidden',
  },
  barGradient: {
    height: '100%',
  },
});

/** `$500` for currency allowances, `1` for counted ones. */
const formatAmount = (
  amount: number,
  unit: EntitlementAllowance['unit'],
): string => {
  const formatted = amount.toLocaleString('en-US');
  return unit === 'currency' ? `$${formatted}` : formatted;
};

/**
 * One benefit, in the list's single grammar:
 *
 * icon | label + rate badge | sublabel | optional trailing action
 *
 * Nothing sits trailing except an action. Trailing figures made every row a
 * different width and left the bars ragged, so state was folded into the
 * sublabel and rates into a badge beside the label — which lets the sublabel
 * and the bar run to the same right margin on every row.
 *
 * Sublabels are held to one line: the rows are a scannable inventory of what
 * the member holds, and wrapping breaks the rhythm that makes them scannable.
 */
const EntitlementRow = ({
  row,
  onAction,
  entranceDelayMs,
  barDelayMs: barDelay,
}: EntitlementRowProps) => {
  const {
    id,
    iconName,
    labelKey,
    badgeKey,
    sublabelKey,
    allowance,
    accrued,
    action,
  } = row;

  const handlePress = useCallback(() => {
    if (action) {
      onAction(action.kind);
    }
  }, [action, onAction]);

  const reduceMotion = useReducedMotion();

  /*
   * The bar shows what is left, not what has been spent, so it agrees with its
   * own sublabel ("$190 of $500 left"). Filling with spend made an unused
   * benefit render as an empty bar, which on a list of things you own reads as
   * having nothing.
   */
  const remainingFraction = useMemo(() => {
    if (!allowance || allowance.limit <= 0) {
      return 0;
    }
    const remaining = Math.max(allowance.limit - allowance.used, 0);
    return Math.min(remaining / allowance.limit, 1);
  }, [allowance]);

  const entrance = useSharedValue(reduceMotion ? 1 : 0);
  /**
   * Depletion progress, not fill progress: `0` is the full allowance and `1` is
   * what actually remains. The bar starts full and drains to its value, so the
   * animation states the entitlement first and the spend second — a bar growing
   * from empty implied the member was accruing the allowance rather than
   * drawing it down.
   */
  const deplete = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      entrance.value = 1;
      return;
    }
    entrance.value = withDelay(
      entranceDelayMs,
      withTiming(1, {
        duration: ENTITLEMENT_INTRO.ROW_MS,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [entrance, entranceDelayMs, reduceMotion]);

  /*
   * Deliberately independent of any layout measurement. Keying this off a
   * measured width
   * meant the drain could not start until layout reported a width, and
   * restarted every time that width changed — so it was easy for the animation
   * to be cancelled or never fire. The bar is clipped by percentage instead, so
   * only the gradient behind it needs measuring.
   */
  useEffect(() => {
    if (reduceMotion) {
      deplete.value = 1;
      return;
    }
    deplete.value = withDelay(
      barDelay,
      withTiming(1, {
        duration: ENTITLEMENT_INTRO.BAR_DEPLETE_MS,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [barDelay, deplete, reduceMotion]);

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [
      {
        translateY: (1 - entrance.value) * ENTITLEMENT_INTRO.ROW_TRAVEL,
      },
    ],
  }));

  /* Clips the whole track down to what remains, as a share of the track. */
  const fillStyle = useAnimatedStyle(() => {
    const visible = 1 - (1 - remainingFraction) * deplete.value;
    return { width: `${visible * 100}%` };
  });

  /*
   * The gradient is sized as a share of the *clip*, chosen so its rendered
   * width always equals the full track — at 38% remaining it is 263% of the
   * clip. That paints the same colour at the same point on the track for every
   * row, and does it without measuring anything: driving the gradient off an
   * `onLayout` width left it zero-width, and so invisible, whenever that
   * measurement did not arrive.
   */
  const gradientStyle = useAnimatedStyle(() => {
    const visible = Math.max(
      1 - (1 - remainingFraction) * deplete.value,
      MIN_VISIBLE_FRACTION,
    );
    return { width: `${100 / visible}%` };
  });

  /*
   * Every value a sublabel might interpolate. Unused ones are ignored, which
   * keeps the copy free to reference whichever of them reads best per row.
   */
  const sublabelParams = useMemo(
    () => ({
      ...(allowance
        ? {
            remaining: formatAmount(
              Math.max(allowance.limit - allowance.used, 0),
              allowance.unit,
            ),
            limit: formatAmount(allowance.limit, allowance.unit),
          }
        : {}),
    }),
    [allowance],
  );

  /* A leading `+` marks a gain, and gains read in green. */
  const isGain = Boolean(accrued?.startsWith('+'));

  const label = strings(labelKey);

  return (
    <Animated.View style={entranceStyle}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Start}
        justifyContent={BoxJustifyContent.Between}
        twClassName="gap-x-3 py-3"
        testID={EntitlementsTestIds.ROW(id)}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Start}
          twClassName="flex-1 gap-x-3"
        >
          <Box twClassName="w-10 h-10 rounded-full bg-muted items-center justify-center shrink-0">
            <Icon
              name={iconName}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
          </Box>

          <Box twClassName="flex-1 gap-y-0.5">
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-x-2"
            >
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
              >
                {label}
              </Text>
              {badgeKey ? (
                <Tag
                  severity={TagSeverity.Success}
                  testID={EntitlementsTestIds.BADGE(id)}
                >
                  {strings(badgeKey)}
                </Tag>
              ) : null}
            </Box>

            {/*
            The accrued figure is a separate nested Text so it alone can carry
            the gain colour. That splits one sentence across two nodes, which
            constrains word order for translators — acceptable while the copy
            is "<amount> earned so far", but worth revisiting if the sublabel
            grows a clause.
          */}
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              numberOfLines={1}
              testID={EntitlementsTestIds.SUBLABEL(id)}
            >
              {accrued ? (
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  color={
                    isGain ? TextColor.SuccessDefault : TextColor.TextDefault
                  }
                >
                  {`${accrued} `}
                </Text>
              ) : null}
              {strings(sublabelKey, sublabelParams)}
            </Text>

            {allowance ? (
              <Box
                twClassName="h-1.5 mt-2 rounded-full bg-muted overflow-hidden"
                testID={EntitlementsTestIds.METER(id)}
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel={label}
                accessibilityValue={{
                  min: 0,
                  max: allowance.limit,
                  now: Math.max(allowance.limit - allowance.used, 0),
                }}
              >
                <Animated.View
                  style={[styles.barFill, fillStyle]}
                  testID={EntitlementsTestIds.METER_FILL(id)}
                >
                  <AnimatedLinearGradient
                    colors={BAR_COLORS}
                    start={BAR_GRADIENT_START}
                    end={BAR_GRADIENT_END}
                    style={[styles.barGradient, gradientStyle]}
                  />
                </Animated.View>
              </Box>
            ) : null}
          </Box>
        </Box>

        {action ? (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={handlePress}
            /* Centred against the label block, which is taller than the button. */
            twClassName="self-center shrink-0"
            testID={EntitlementsTestIds.ACTION(id)}
          >
            {strings(action.labelKey)}
          </Button>
        ) : null}
      </Box>
    </Animated.View>
  );
};

export default EntitlementRow;
