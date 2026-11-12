import React from 'react';
import type { AssetsControllerState } from '@metamask/assets-controller';
import { act, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { CollectiblesCardsTestIds } from '../../Collectibles.testIds';
import ReplitCollectionAmount from '../CollectiblesMotion/ReplitCollectionAmount';
import { useCollectionTransfer } from './CollectionTransferProvider';
import CollectionValue from './CollectionValue';

jest.mock('../CollectiblesMotion/ReplitCollectionAmount', () =>
  jest.fn(() => null),
);
jest.mock('./CollectionTransferProvider', () => ({
  useCollectionTransfer: jest.fn(),
}));

const transfer = (identity?: string, arrivalValue = 0) =>
  jest.mocked(useCollectionTransfer).mockReturnValue({
    identity,
    arrivalValue,
    pendingMints: [],
    beginTransfers: jest.fn(),
    cancelTransfers: jest.fn(),
    registerTarget: jest.fn(),
  });
const renderValue = (
  component: React.ReactElement,
  currency: AssetsControllerState['selectedCurrency'] = 'usd',
  rate?: number,
) =>
  renderWithProvider(component, {
    state: {
      engine: {
        backgroundState: {
          AssetsController: {
            selectedCurrency: currency,
            assetsInfo: {
              'eip155:1/slip44:60': {
                type: 'native',
                symbol: 'ETH',
                name: 'Ether',
                decimals: 18,
              },
            },
            assetsPrice:
              rate === undefined
                ? {}
                : {
                    'eip155:1/slip44:60': {
                      assetPriceType: 'fungible',
                      price: rate,
                      usdPrice: 1,
                      lastUpdated: 1,
                    },
                  },
          },
        },
      },
    },
  });

const amount = () => jest.mocked(ReplitCollectionAmount).mock.lastCall?.[0];

describe('Collection value arrival', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    transfer();
  });

  it('exposes the confirmed value accessibly without animating an ordinary visit', () => {
    renderValue(<CollectionValue value={200} isActive />);

    expect(screen.getByTestId(CollectiblesCardsTestIds.TOTAL_VALUE)).toHaveProp(
      'accessibilityLabel',
      '$200.00',
    );
    expect(amount()).toEqual(expect.objectContaining({ from: 200, to: 200 }));
  });

  it('keeps the starting amount until the digit animation finishes even when the card flight already ended', () => {
    transfer('arrival-1', 40);
    const { rerender } = renderValue(<CollectionValue value={200} isActive />);
    expect(amount()).toEqual(expect.objectContaining({ from: 160, to: 200 }));

    transfer();
    rerender(<CollectionValue value={200} isActive />);
    expect(amount()).toEqual(expect.objectContaining({ from: 160, to: 200 }));
    act(() => amount()?.onComplete?.());
    expect(amount()).toEqual(expect.objectContaining({ from: 200, to: 200 }));
  });

  it('does not allow a stale completion to stop a new arrival', () => {
    transfer('arrival-1', 40);
    const { rerender } = renderValue(<CollectionValue value={200} isActive />);
    const oldCompletion = amount()?.onComplete;
    transfer('arrival-2', 10);
    rerender(<CollectionValue value={210} isActive />);

    act(() => oldCompletion?.());

    expect(amount()).toEqual(
      expect.objectContaining({
        identity: 'arrival-2:usd:en',
        from: 200,
        to: 210,
      }),
    );
  });

  it('does not replay an arrival after leaving and returning to the tab', () => {
    transfer('arrival-1', 40);
    const { rerender } = renderValue(<CollectionValue value={200} isActive />);
    rerender(<CollectionValue value={200} isActive={false} />);
    rerender(<CollectionValue value={200} isActive />);

    expect(amount()).toEqual(expect.objectContaining({ from: 200, to: 200 }));
  });

  it('converts both endpoints of a confirmed arrival and passes its currency to NumberFlow', () => {
    transfer('arrival-eur', 40);
    renderValue(<CollectionValue value={200} isActive />, 'eur', 0.8);

    expect(amount()).toEqual(
      expect.objectContaining({
        from: 128,
        to: 160,
        currency: 'eur',
        locale: 'en',
      }),
    );
    expect(screen.getByTestId(CollectiblesCardsTestIds.TOTAL_VALUE)).toHaveProp(
      'accessibilityLabel',
      '€160.00',
    );
  });

  it('omits the amount animation until a conversion rate is available', () => {
    renderValue(<CollectionValue value={200} isActive />, 'eur');

    expect(ReplitCollectionAmount).not.toHaveBeenCalled();
    expect(screen.getByTestId(CollectiblesCardsTestIds.TOTAL_VALUE)).toHaveProp(
      'accessibilityLabel',
      '—',
    );
  });

  it('shows a native confirmed value when the isolated renderer fails', () => {
    renderValue(<CollectionValue value={11.05} isActive />);

    act(() => amount()?.onError?.());

    expect(screen.getByText('$11.05')).toBeOnTheScreen();
  });
});
