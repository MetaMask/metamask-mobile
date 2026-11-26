import type {
  VaultCompositionComponent,
  VaultCompositionResponse,
} from '../../../../types/moneyVaultComposition';
import { createVaultCompositionComponent } from '../../../../__fixtures__/moneyVaultComposition';
import { mockTheme } from '../../../../../../../util/theme';
import {
  buildVaultCompositionChartModel,
  getVaultCompositionComponentColor,
  getVaultCompositionComponentsInChartOrder,
} from './MoneyVaultCompositionChart.utils';

const createComponent = (
  overrides: Partial<VaultCompositionComponent> = {},
): VaultCompositionComponent =>
  createVaultCompositionComponent({
    allocation_fraction: '0.38',
    ...overrides,
  });

const createComponents = (
  components: VaultCompositionComponent[],
): VaultCompositionResponse['components'] => components;

describe('buildVaultCompositionChartModel', () => {
  it('builds one wedge for one positive component', () => {
    const result = buildVaultCompositionChartModel(
      createComponents([createComponent()]),
    );

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') {
      return;
    }

    expect(result.wedges).toHaveLength(1);
    expect(result.defaultActiveKey).toBe('direct_idle_musd');
    expect(result.wedges[0]).toEqual(
      expect.objectContaining({
        componentKey: 'direct_idle_musd',
        allocationFraction: '0.38',
      }),
    );
  });

  it('sorts wedges by true allocation descending, then component key', () => {
    const result = buildVaultCompositionChartModel(
      createComponents([
        createComponent({
          component_key: 'morpho_v2_musd',
          allocation_fraction: '0.30000000000000000001',
        }),
        createComponent({
          component_key: 'direct_idle_usdc',
          allocation_fraction: '0.38',
        }),
        createComponent({
          component_key: 'direct_idle_musd',
          allocation_fraction: '0.30000000000000000000',
        }),
        createComponent({
          component_key: 'aave_v3_musd',
          allocation_fraction: '0',
        }),
      ]),
    );

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') {
      return;
    }

    expect(result.wedges.map(({ componentKey }) => componentKey)).toEqual([
      'direct_idle_usdc',
      'morpho_v2_musd',
      'direct_idle_musd',
    ]);
  });

  it('normalizes fractions when their sum has rounding drift', () => {
    const result = buildVaultCompositionChartModel(
      createComponents([
        createComponent({
          component_key: 'direct_idle_musd',
          allocation_fraction: '0.333333333333333333333333333333',
        }),
        createComponent({
          component_key: 'direct_idle_usdc',
          allocation_fraction: '0.333333333333333333333333333334',
        }),
        createComponent({
          component_key: 'aave_v3_musd',
          allocation_fraction: '0.333333333333333333333333333333',
        }),
      ]),
    );

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') {
      return;
    }

    const paintedAngleTotal = result.wedges.reduce(
      (total, wedge) => total + wedge.paintedAngleDegrees,
      0,
    );

    expect(paintedAngleTotal).toBeCloseTo(354, 8);
    expect(
      result.wedges.map(({ paintedAngleDegrees }) => paintedAngleDegrees),
    ).toEqual(
      expect.arrayContaining([
        expect.closeTo(118, 8),
        expect.closeTo(118, 8),
        expect.closeTo(118, 8),
      ]),
    );
  });

  it('clamps tiny positive allocations to the minimum painted angle after gaps', () => {
    const result = buildVaultCompositionChartModel(
      createComponents([
        createComponent({
          component_key: 'direct_idle_musd',
          allocation_fraction: '0.0000000000000000000001',
        }),
        createComponent({
          component_key: 'direct_idle_usdc',
          allocation_fraction: '0.9999999999999999999999',
        }),
      ]),
    );

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') {
      return;
    }

    const tinyWedge = result.wedges.find(
      ({ componentKey }) => componentKey === 'direct_idle_musd',
    );

    expect(tinyWedge?.paintedAngleDegrees).toBeGreaterThanOrEqual(2);
    expect(
      result.wedges.reduce(
        (total, wedge) => total + wedge.paintedAngleDegrees,
        0,
      ),
    ).toBeCloseTo(356, 8);
  });

  it('returns empty when all allocations are zero', () => {
    const result = buildVaultCompositionChartModel(
      createComponents([
        createComponent({ allocation_fraction: '0' }),
        createComponent({
          component_key: 'direct_idle_usdc',
          allocation_fraction: '0.000',
        }),
      ]),
    );

    expect(result).toEqual({ status: 'empty' });
  });

  it.each([
    [
      'duplicate component keys',
      [createComponent(), createComponent({ allocation_fraction: '0.62' })],
    ],
    [
      'malformed fractions',
      [createComponent({ allocation_fraction: 'not-a-decimal' })],
    ],
    ['negative fractions', [createComponent({ allocation_fraction: '-0.1' })]],
  ])('returns invalid for %s', (_description, components) => {
    expect(
      buildVaultCompositionChartModel(createComponents(components)),
    ).toEqual(expect.objectContaining({ status: 'invalid' }));
  });

  it('returns invalid when positive minimums and separators cannot fit', () => {
    const components = Array.from({ length: 91 }, (_, index) =>
      createComponent({
        component_key:
          `runtime_component_${index}` as VaultCompositionComponent['component_key'],
        allocation_fraction: '1',
      }),
    );

    expect(
      buildVaultCompositionChartModel(createComponents(components)),
    ).toEqual(expect.objectContaining({ status: 'invalid' }));
  });
});

describe('getVaultCompositionComponentsInChartOrder', () => {
  it('filters zero allocations and sorts positive allocations', () => {
    const result = getVaultCompositionComponentsInChartOrder(
      createComponents([
        createComponent({
          component_key: 'aave_v3_musd',
          allocation_fraction: '0.2',
        }),
        createComponent({
          component_key: 'direct_idle_usdc',
          allocation_fraction: '0.8',
        }),
        createComponent({
          component_key: 'morpho_v2_musd',
          allocation_fraction: '0',
        }),
      ]),
    );

    expect(
      result.map(({ component_key: componentKey }) => componentKey),
    ).toEqual(['direct_idle_usdc', 'aave_v3_musd']);
  });

  it('returns no components when allocation data is invalid', () => {
    const result = getVaultCompositionComponentsInChartOrder(
      createComponents([
        createComponent({ allocation_fraction: 'not-a-decimal' }),
      ]),
    );

    expect(result).toEqual([]);
  });
});

describe('getVaultCompositionComponentColor', () => {
  it('uses the shared theme color for known component keys', () => {
    const result = getVaultCompositionComponentColor(
      'aave_v3_musd',
      mockTheme.colors,
    );

    expect(result).toBe(mockTheme.colors.info.default);
  });

  it('keeps fallback colors stable for unknown component keys', () => {
    const firstResult = getVaultCompositionComponentColor(
      'future_component',
      mockTheme.colors,
    );
    const secondResult = getVaultCompositionComponentColor(
      'future_component',
      mockTheme.colors,
    );

    expect(secondResult).toBe(firstResult);
  });
});
