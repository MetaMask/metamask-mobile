import React from 'react';
import { render } from '@testing-library/react-native';
import CardBalanceDisplay from './CardBalanceDisplay';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string): string => key,
}));

jest.mock('../../../components/CardAssetItem', () => {
  const { View } = jest.requireActual('react-native');
  return function CardAssetItemMock(): React.ReactElement {
    return <View testID="card-asset-item" />;
  };
});

const baseProps = {
  isLoading: false,
  balanceAmount: undefined,
  privacyMode: false,
  assetBalance: undefined,
  onTogglePrivacy: jest.fn(),
};

describe('CardBalanceDisplay', () => {
  it('renders a dash when the balance is unavailable', () => {
    const { getByText, queryByText } = render(
      <CardBalanceDisplay {...baseProps} isUnavailable />,
    );

    expect(getByText('—')).toBeOnTheScreen();
    expect(queryByText('0')).toBeNull();
  });

  it('renders zero when a known balance amount is missing and the read succeeded', () => {
    const { getByText } = render(<CardBalanceDisplay {...baseProps} />);

    expect(getByText('0')).toBeOnTheScreen();
  });
});
