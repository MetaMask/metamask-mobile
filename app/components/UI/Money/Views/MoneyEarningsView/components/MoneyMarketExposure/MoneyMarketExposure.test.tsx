import React from 'react';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../../../locales/i18n';
import type { VaultCompositionResponse } from '../../../../types/moneyVaultComposition';
import MoneyMarketExposure from './MoneyMarketExposure';
import { MoneyMarketExposureTestIds } from './MoneyMarketExposure.testIds';
import { MoneyMarketExposureRowTestIds } from '../MoneyMarketExposureRow/MoneyMarketExposureRow.testIds';

const createProtocol = (
  protocolKey: VaultCompositionResponse['protocols'][number]['protocol_key'],
  allocationFraction: string,
): VaultCompositionResponse['protocols'][number] => ({
  protocol_key: protocolKey,
  allocation_value_usd: '1',
  allocation_fraction: allocationFraction,
  organic_supply_apy: '0',
  incentive_apr: null,
  estimated_total_annual_rate: null,
});

describe('MoneyMarketExposure', () => {
  it('renders the localized heading and protocols in allocation order', () => {
    const protocols = [
      createProtocol('aave_v3', '0.38'),
      createProtocol('liquidity_buffer', '0.62'),
    ];

    const { getByTestId, getAllByTestId } = renderWithProvider(
      <MoneyMarketExposure protocols={protocols} />,
    );

    expect(getByTestId(MoneyMarketExposureTestIds.TITLE)).toHaveTextContent(
      strings('money.earnings.protocol_exposure'),
    );
    expect(
      getAllByTestId(
        /^money-market-exposure-row-(?:liquidity_buffer|aave_v3)$/,
      ).map((row) => row.props.testID),
    ).toEqual([
      MoneyMarketExposureRowTestIds.ROW('liquidity_buffer'),
      MoneyMarketExposureRowTestIds.ROW('aave_v3'),
    ]);
  });

  it('renders a visible empty state when protocols are unavailable', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyMarketExposure protocols={[]} />,
    );

    expect(getByTestId(MoneyMarketExposureTestIds.EMPTY)).toHaveTextContent(
      strings('money.earnings.allocation_empty'),
    );
  });
});
