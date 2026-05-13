import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import PayWithSection from './pay-with-section';
import { PayWithSectionConfig } from '../../modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const buildConfig = (
  overrides: Partial<PayWithSectionConfig> = {},
): PayWithSectionConfig => ({
  id: 'crypto',
  title: 'Crypto',
  rows: [
    {
      id: 'usdc',
      icon: <Text>USDC-icon</Text>,
      title: 'USDC',
      subtitle: '$500.00 available',
    },
  ],
  ...overrides,
});

describe('PayWithSection', () => {
  it('renders section title in uppercase', () => {
    const { getByTestId } = render(<PayWithSection config={buildConfig()} />);

    expect(getByTestId('pay-with-section-crypto-title')).toHaveTextContent(
      'CRYPTO',
    );
  });

  it('renders one row per config entry', () => {
    const config = buildConfig({
      rows: [
        { id: 'usdc', icon: <Text>USDC</Text>, title: 'USDC' },
        { id: 'pol', icon: <Text>POL</Text>, title: 'POL' },
      ],
    });

    const { getByTestId } = render(<PayWithSection config={config} />);

    expect(getByTestId('payment-method-row-usdc')).toBeOnTheScreen();
    expect(getByTestId('payment-method-row-pol')).toBeOnTheScreen();
  });

  it('renders empty rows container when section has no rows', () => {
    const config = buildConfig({ rows: [] });

    const { getByTestId, queryByTestId } = render(
      <PayWithSection config={config} />,
    );

    expect(getByTestId('pay-with-section-crypto-rows')).toBeOnTheScreen();
    expect(queryByTestId('payment-method-row-usdc')).not.toBeOnTheScreen();
  });

  it('uses custom testID when provided', () => {
    const config = buildConfig({ testID: 'custom-section' });

    const { getByTestId } = render(<PayWithSection config={config} />);

    expect(getByTestId('custom-section')).toBeOnTheScreen();
    expect(getByTestId('custom-section-title')).toBeOnTheScreen();
    expect(getByTestId('custom-section-rows')).toBeOnTheScreen();
  });
});
