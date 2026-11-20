import React from 'react';
import { StyleSheet } from 'react-native';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../../../locales/i18n';
import type { VaultCompositionResponse } from '../../../../types/moneyVaultComposition';
import MoneyMarketExposureRow from './MoneyMarketExposureRow';
import { MoneyMarketExposureRowTestIds } from './MoneyMarketExposureRow.testIds';

const createProtocol = (
  overrides: Partial<VaultCompositionResponse['protocols'][number]> = {},
): VaultCompositionResponse['protocols'][number] => ({
  protocol_key: 'aave_v3',
  allocation_value_usd: '1',
  allocation_fraction: '0.38',
  organic_supply_apy: '0',
  incentive_apr: null,
  estimated_total_annual_rate: null,
  ...overrides,
});

describe('MoneyMarketExposureRow', () => {
  it('renders protocol name and allocation percentage', () => {
    const protocol = createProtocol();

    const { getByTestId } = renderWithProvider(
      <MoneyMarketExposureRow protocol={protocol} />,
    );

    expect(
      getByTestId(MoneyMarketExposureRowTestIds.LABEL(protocol.protocol_key)),
    ).toHaveTextContent('Aave v3');
    expect(
      getByTestId(
        MoneyMarketExposureRowTestIds.ALLOCATION(protocol.protocol_key),
      ),
    ).toHaveTextContent('38%');
  });

  it('exposes allocation as a progress bar with percentage values', () => {
    const protocol = createProtocol();

    const { getByTestId } = renderWithProvider(
      <MoneyMarketExposureRow protocol={protocol} />,
    );
    const track = getByTestId(
      MoneyMarketExposureRowTestIds.TRACK(protocol.protocol_key),
    );
    const fill = getByTestId(
      MoneyMarketExposureRowTestIds.FILL(protocol.protocol_key),
    );

    expect(track.props.accessibilityRole).toBe('progressbar');
    expect(track.props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 38,
      text: '38%',
    });
    expect(StyleSheet.flatten(fill.props.style)).toEqual(
      expect.objectContaining({ width: '38%' }),
    );
  });

  it('formats cash reserve protocol names with localization', () => {
    const protocol = createProtocol({
      protocol_key: 'liquidity_buffer',
      allocation_fraction: '0.62',
    });

    const { getByTestId } = renderWithProvider(
      <MoneyMarketExposureRow protocol={protocol} />,
    );

    expect(
      getByTestId(MoneyMarketExposureRowTestIds.LABEL(protocol.protocol_key)),
    ).toHaveTextContent(strings('money.earnings.cash_reserve'));
  });

  it('throws when allocation fraction is outside the bar range', () => {
    const protocol = createProtocol({ allocation_fraction: '1.01' });

    expect(() =>
      renderWithProvider(<MoneyMarketExposureRow protocol={protocol} />),
    ).toThrow(
      "Cannot calculate vault composition bar width from invalid allocation fraction '1.01'",
    );
  });
});
