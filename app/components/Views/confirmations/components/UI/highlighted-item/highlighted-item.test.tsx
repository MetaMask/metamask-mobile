import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { HighlightedItem } from '../../../types/token';
import { HighlightedItem as HighlightedItemRow } from './highlighted-item';

describe('HighlightedItem', () => {
  const mockRowAction = jest.fn();
  const mockButtonAction = jest.fn();

  const assetItem: HighlightedItem = {
    position: 'in_asset_list',
    icon: 'https://example.com/perps.png',
    name: 'Perps Balance',
    name_description: 'USD',
    fiat: '$31.16',
    fiat_description: '31.16 USD',
    action: mockRowAction,
  };

  const actionItem: HighlightedItem = {
    position: 'outside_of_asset_list',
    icon: IconName.Add,
    name: 'Top up',
    name_description: 'Buy USDC',
    fiat: '',
    fiat_description: '',
    action: mockRowAction,
    actions: [
      {
        buttonLabel: 'Add',
        onPress: mockButtonAction,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders highlighted asset content', () => {
    const { getByText } = renderWithProvider(
      <HighlightedItemRow item={assetItem} />,
    );

    expect(getByText('Perps Balance')).toBeOnTheScreen();
    expect(getByText('USD')).toBeOnTheScreen();
    expect(getByText('$31.16')).toBeOnTheScreen();
    expect(getByText('31.16 USD')).toBeOnTheScreen();
  });

  it('calls row action when pressed', () => {
    const { getByText } = renderWithProvider(
      <HighlightedItemRow item={assetItem} />,
    );

    fireEvent.press(getByText('Perps Balance'));

    expect(mockRowAction).toHaveBeenCalledTimes(1);
  });

  it('renders action buttons', () => {
    const { getByText } = renderWithProvider(
      <HighlightedItemRow item={actionItem} />,
    );

    expect(getByText('Add')).toBeOnTheScreen();
  });

  it('calls action button handler when pressed', () => {
    const { getByText } = renderWithProvider(
      <HighlightedItemRow item={actionItem} />,
    );

    fireEvent.press(getByText('Add'));

    expect(mockButtonAction).toHaveBeenCalledTimes(1);
    expect(mockRowAction).toHaveBeenCalledTimes(0);
  });

  it('shows Icon when icon is an IconName', () => {
    const { getByTestId } = renderWithProvider(
      <HighlightedItemRow item={actionItem} />,
    );

    expect(getByTestId('icon')).toBeOnTheScreen();
  });

  it('shows no action buttons when isLoading is true', () => {
    const { queryByText } = renderWithProvider(
      <HighlightedItemRow item={{ ...actionItem, isLoading: true }} />,
    );

    expect(queryByText('Add')).not.toBeOnTheScreen();
  });

  it('renders PaymentMethodIcon when paymentType is set', () => {
    const paymentItem: HighlightedItem = {
      ...assetItem,
      paymentType: 'debit-credit-card',
    };

    const { getByTestId, getByText } = renderWithProvider(
      <HighlightedItemRow item={paymentItem} />,
    );

    expect(getByTestId('icon')).toBeOnTheScreen();
    expect(getByText('Perps Balance')).toBeOnTheScreen();
  });
});
