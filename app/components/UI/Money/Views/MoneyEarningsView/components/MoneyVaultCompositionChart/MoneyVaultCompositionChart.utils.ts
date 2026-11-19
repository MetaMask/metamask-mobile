import BigNumber from 'bignumber.js';
import { arc } from 'd3-shape';
import type { VaultCompositionResponse } from '../../../../types/moneyVaultComposition';
import type {
  ComponentKey,
  VaultCompositionChartModel,
  VaultCompositionWedge,
} from './MoneyVaultCompositionChart.types';

export const CHART_VIEWBOX_SIZE = 200;
export const CHART_CENTER = CHART_VIEWBOX_SIZE / 2;
export const DONUT_INNER_RADIUS = 64;
export const DONUT_OUTER_RADIUS = 80;
export const PRESSED_DONUT_OUTER_RADIUS = 86;
export const SEPARATOR_ANGLE_DEGREES = 2;
export const MINIMUM_PAINTED_ANGLE_DEGREES = 2;

const DEGREES_IN_CIRCLE = new BigNumber(360);
const RADIANS_PER_DEGREE = Math.PI / 180;
const DECIMAL_PATTERN = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

type VaultComponent = VaultCompositionResponse['components'][number];

interface ParsedComponent {
  component: VaultComponent;
  allocation: BigNumber;
}

/**
 * Tests whether an arbitrary point lands inside a painted donut wedge.
 *
 * @param x - Point x coordinate in the chart viewBox.
 * @param y - Point y coordinate in the chart viewBox.
 * @param wedges - Wedges produced by `buildVaultCompositionChartModel`.
 * @returns The matching component key, or null outside the painted ring.
 */
export const getVaultCompositionComponentKeyAtPoint = (
  x: number,
  y: number,
  wedges: VaultCompositionWedge[],
): ComponentKey | null => {
  const deltaX = x - CHART_CENTER;
  const deltaY = y - CHART_CENTER;
  const radius = Math.sqrt(deltaX ** 2 + deltaY ** 2);

  if (radius < DONUT_INNER_RADIUS || radius > PRESSED_DONUT_OUTER_RADIUS) {
    return null;
  }

  const angle = normalizeRadians(Math.atan2(deltaX, -deltaY));

  return (
    wedges.find(
      ({ paintedStartAngle, paintedEndAngle }) =>
        angle >= paintedStartAngle && angle <= paintedEndAngle,
    )?.componentKey ?? null
  );
};

/**
 * Builds a validated, sorted, and normalized model for the composition chart.
 *
 * @param components - Components returned by the vault composition API.
 * @returns A renderable, empty, or invalid chart model.
 */
export const buildVaultCompositionChartModel = (
  components: VaultCompositionResponse['components'],
): VaultCompositionChartModel => {
  const parsedComponents: ParsedComponent[] = [];
  const componentKeys = new Set<string>();

  for (const component of components) {
    if (componentKeys.has(component.component_key)) {
      return { status: 'invalid', reason: 'duplicate_component_key' };
    }

    componentKeys.add(component.component_key);

    const allocation = parseAllocationFraction(component.allocation_fraction);
    if (allocation === null) {
      return { status: 'invalid', reason: 'invalid_allocation_fraction' };
    }

    parsedComponents.push({ component, allocation });
  }

  const positiveComponents = parsedComponents
    .filter(({ allocation }) => allocation.gt(0))
    .sort(compareParsedComponents);

  if (positiveComponents.length === 0) {
    return { status: 'empty' };
  }

  const positiveCount = positiveComponents.length;
  const availablePaintedDegrees = DEGREES_IN_CIRCLE.minus(
    new BigNumber(positiveCount * SEPARATOR_ANGLE_DEGREES),
  );
  const minimumPaintedDegrees = new BigNumber(MINIMUM_PAINTED_ANGLE_DEGREES);

  if (availablePaintedDegrees.lt(minimumPaintedDegrees.times(positiveCount))) {
    return { status: 'invalid', reason: 'infeasible_geometry' };
  }

  const totalAllocation = positiveComponents.reduce(
    (total, { allocation }) => total.plus(allocation),
    new BigNumber(0),
  );
  const paintedAngles = redistributePaintedAngles(
    positiveComponents.map(({ allocation }) =>
      allocation.times(availablePaintedDegrees).dividedBy(totalAllocation),
    ),
    availablePaintedDegrees,
    minimumPaintedDegrees,
  );

  let segmentStartDegrees = new BigNumber(0);
  const wedges = positiveComponents.map(
    ({ component, allocation }, index): VaultCompositionWedge => {
      const paintedAngleDegrees = paintedAngles[index];
      const segmentEndDegrees = segmentStartDegrees
        .plus(new BigNumber(SEPARATOR_ANGLE_DEGREES))
        .plus(paintedAngleDegrees);
      const paintedStartDegrees = segmentStartDegrees.plus(
        new BigNumber(SEPARATOR_ANGLE_DEGREES).dividedBy(2),
      );
      const paintedEndDegrees = paintedStartDegrees.plus(paintedAngleDegrees);
      const segmentStartAngle = degreesToRadians(segmentStartDegrees);
      const segmentEndAngle = degreesToRadians(segmentEndDegrees);
      const paintedStartAngle = degreesToRadians(paintedStartDegrees);
      const paintedEndAngle = degreesToRadians(paintedEndDegrees);

      segmentStartDegrees = segmentEndDegrees;

      return {
        component,
        componentKey: component.component_key,
        allocationFraction: component.allocation_fraction,
        segmentStartAngle,
        segmentEndAngle,
        paintedStartAngle,
        paintedEndAngle,
        paintedAngleDegrees: paintedAngleDegrees.toNumber(),
        path: createArcPath(
          paintedStartAngle,
          paintedEndAngle,
          DONUT_OUTER_RADIUS,
        ),
        pressedPath: createArcPath(
          paintedStartAngle,
          paintedEndAngle,
          PRESSED_DONUT_OUTER_RADIUS,
        ),
      };
    },
  );

  return {
    status: 'ready',
    wedges,
    defaultActiveKey: wedges[0].componentKey,
  };
};

/**
 * Formats a fractional allocation as a locale-aware percentage.
 *
 * @param allocationFraction - Decimal fraction such as `0.38`.
 * @param locale - BCP 47 locale used for decimal and percent formatting.
 * @returns A localized percentage string.
 */
export const formatAllocationPercentage = (
  allocationFraction: string,
  locale: string,
): string => {
  const parsedAllocation = parseAllocationFraction(allocationFraction);
  if (parsedAllocation === null) {
    throw new Error(
      `Cannot format invalid allocation fraction '${allocationFraction}'`,
    );
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 2,
  });

  if (parsedAllocation.gt(0) && parsedAllocation.lt(new BigNumber('0.0001'))) {
    const lowerBoundFormatter = new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return `<${lowerBoundFormatter.format(0.0001)}`;
  }

  return formatter.format(parsedAllocation.toNumber());
};

function parseAllocationFraction(value: string): BigNumber | null {
  if (!DECIMAL_PATTERN.test(value)) {
    return null;
  }

  const parsed = new BigNumber(value);
  return parsed.isFinite() && !parsed.isNegative() ? parsed : null;
}

function compareParsedComponents(
  first: ParsedComponent,
  second: ParsedComponent,
): number {
  if (first.allocation.gt(second.allocation)) {
    return -1;
  }

  if (first.allocation.lt(second.allocation)) {
    return 1;
  }

  return first.component.component_key < second.component.component_key
    ? -1
    : 1;
}

function redistributePaintedAngles(
  rawAngles: BigNumber[],
  availablePaintedDegrees: BigNumber,
  minimumPaintedDegrees: BigNumber,
): BigNumber[] {
  const clampedAngles = rawAngles.map((angle) =>
    angle.lt(minimumPaintedDegrees) ? minimumPaintedDegrees : angle,
  );
  const clampedTotal = clampedAngles.reduce(
    (total, angle) => total.plus(angle),
    new BigNumber(0),
  );
  const excess = clampedTotal.minus(availablePaintedDegrees);

  if (!excess.gt(0)) {
    return clampedAngles;
  }

  const capacities = clampedAngles.map((angle) =>
    angle.minus(minimumPaintedDegrees),
  );
  const totalCapacity = capacities.reduce(
    (total, capacity) => total.plus(capacity),
    new BigNumber(0),
  );

  return clampedAngles.map((angle, index) => {
    if (totalCapacity.isZero()) {
      return minimumPaintedDegrees;
    }

    return angle.minus(
      excess.times(capacities[index]).dividedBy(totalCapacity),
    );
  });
}

function degreesToRadians(degrees: BigNumber): number {
  return degrees.times(RADIANS_PER_DEGREE).toNumber();
}

function createArcPath(
  startAngle: number,
  endAngle: number,
  outerRadius: number,
): string {
  return (
    arc<undefined>()
      .innerRadius(DONUT_INNER_RADIUS)
      .outerRadius(outerRadius)
      .startAngle(startAngle)
      .endAngle(endAngle)(undefined) ?? ''
  );
}

function normalizeRadians(angle: number): number {
  const normalized = angle % (Math.PI * 2);
  return normalized < 0 ? normalized + Math.PI * 2 : normalized;
}
