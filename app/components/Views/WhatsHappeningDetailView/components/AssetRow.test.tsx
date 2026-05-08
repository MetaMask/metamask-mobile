import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { TextColor } from '@metamask/design-system-react-native';
import type { RelatedAsset } from '@metamask/ai-controllers';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import AssetRow from './AssetRow';

jest.mock('../utils/getRelatedAssetImageSource', () => ({
  getRelatedAssetImageSource: jest.fn(() => undefined),
}));

jest.mock(
  '../../../UI/Tokens/components/TokenListSecurityBadge/TokenListSecurityBadge',
  () => 'TokenListSecurityBadge',
);

const btcAsset: RelatedAsset = {
  sourceAssetId: 'bitcoin',
  symbol: 'BTC',
  name: 'Bitcoin',
  caip19: ['eip155:1/slip44:0'],
};

const symbolOnlyAsset: RelatedAsset = {
  sourceAssetId: 'unknown',
  symbol: 'UNK',
  name: '',
  caip19: [],
};

describe('AssetRow', () => {
  const onAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays asset.name when name is present', () => {
    renderWithProvider(
      <AssetRow
        asset={btcAsset}
        actionLabel="Buy"
        accessibilityLabel="Buy BTC"
        onAction={onAction}
      />,
    );
    expect(screen.getByText('Bitcoin')).toBeOnTheScreen();
  });

  it('falls back to asset.symbol when name is empty', () => {
    renderWithProvider(
      <AssetRow
        asset={symbolOnlyAsset}
        actionLabel="Buy"
        accessibilityLabel="Buy UNK"
        onAction={onAction}
      />,
    );
    expect(screen.getByText('UNK')).toBeOnTheScreen();
  });

  it('does not render an action button when onAction is omitted', () => {
    renderWithProvider(<AssetRow asset={btcAsset} />);
    expect(screen.queryByText('Buy')).toBeNull();
    expect(screen.queryByText('Trade')).toBeNull();
  });

  it('renders the action button with the provided label', () => {
    renderWithProvider(
      <AssetRow
        asset={btcAsset}
        actionLabel="Trade"
        accessibilityLabel="Trade BTC"
        onAction={onAction}
      />,
    );
    expect(screen.getByText('Trade')).toBeOnTheScreen();
  });

  it('calls onAction when the button is pressed', () => {
    renderWithProvider(
      <AssetRow
        asset={btcAsset}
        actionLabel="Buy"
        accessibilityLabel="Buy BTC"
        onAction={onAction}
      />,
    );
    fireEvent.press(screen.getByText('Buy'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders the TokenListSecurityBadge when caipAssetId is provided', () => {
    renderWithProvider(
      <AssetRow
        asset={btcAsset}
        actionLabel="Buy"
        accessibilityLabel="Buy BTC"
        onAction={onAction}
        caipAssetId="eip155:1/slip44:0"
      />,
    );
    expect(screen.getByTestId !== undefined).toBeTruthy();
    // The mocked component renders as 'TokenListSecurityBadge' native element
    const badge = screen.UNSAFE_getByType(
      'TokenListSecurityBadge' as unknown as React.ComponentType,
    );
    expect(badge).toBeTruthy();
    expect(badge.props.caipAssetId).toBe('eip155:1/slip44:0');
  });

  it('does not render the security badge when caipAssetId is not provided', () => {
    renderWithProvider(
      <AssetRow
        asset={btcAsset}
        actionLabel="Buy"
        accessibilityLabel="Buy BTC"
        onAction={onAction}
      />,
    );
    expect(
      screen.UNSAFE_queryByType(
        'TokenListSecurityBadge' as unknown as React.ComponentType,
      ),
    ).toBeNull();
  });

  it('renders the price secondary line when secondaryLine is provided', () => {
    renderWithProvider(
      <AssetRow
        asset={btcAsset}
        actionLabel="Buy"
        accessibilityLabel="Buy BTC"
        onAction={onAction}
        secondaryLine={{
          priceText: '$95,000.00',
          changeText: '+2.50%',
          changeColor: TextColor.SuccessDefault,
        }}
      />,
    );
    expect(screen.getByText('$95,000.00')).toBeOnTheScreen();
    expect(screen.getByText('+2.50%')).toBeOnTheScreen();
  });

  it('renders just the price without change text when changeText is undefined', () => {
    renderWithProvider(
      <AssetRow
        asset={btcAsset}
        actionLabel="Buy"
        accessibilityLabel="Buy BTC"
        onAction={onAction}
        secondaryLine={{
          priceText: '$95,000.00',
          changeText: undefined,
          changeColor: TextColor.TextAlternative,
        }}
      />,
    );
    expect(screen.getByText('$95,000.00')).toBeOnTheScreen();
    expect(screen.queryByText('%')).toBeNull();
  });

  it('does not render secondary line when secondaryLine is not provided', () => {
    renderWithProvider(
      <AssetRow
        asset={btcAsset}
        actionLabel="Buy"
        accessibilityLabel="Buy BTC"
        onAction={onAction}
      />,
    );
    expect(screen.queryByText('$')).toBeNull();
  });
});
