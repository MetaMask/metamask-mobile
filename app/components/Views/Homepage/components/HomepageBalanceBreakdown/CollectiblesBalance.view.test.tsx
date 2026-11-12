import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { Button, Text } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { createDeferredPromise } from '@metamask/utils';
import { useQueryClient } from '@tanstack/react-query';
import { renderCollectiblesView } from '../../../../../../tests/component-view/renderers/collectibles';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import Routes from '../../../../../constants/navigation/Routes';
import { useRefreshPackPartnerCards } from '../../../../UI/Collectibles';
import type { CollectiblesCard } from '../../../../UI/Collectibles/types';
import {
  createCard,
  packPartnerReads,
  MOCK_ACCOUNT,
} from '../../../../UI/Collectibles/views/testUtils';
import { packPartnerQueries } from '../../../../UI/Collectibles/services/data/packPartnerQueries';
import { PACK_PARTNER_ENVIRONMENT } from '../../../../UI/Collectibles/providers/pack-partner/constants';
import { useCollectiblesSlice } from '../../BalanceBreakdown/hooks/slices/useCollectiblesSlice';
import { useFiatNormalizer } from '../../BalanceBreakdown/hooks/useFiatNormalizer';
import HomepageBalanceBreakdownRow from './HomepageBalanceBreakdownRow';
import { HomepageBalanceBreakdownTestIds as ids } from './HomepageBalanceBreakdown.testIds';

/** Real slice, Redux currency, row and refresh; only the service boundary is a fixture. */
const CollectiblesBalance = (): React.JSX.Element => {
  const { toUserCurrency, userCurrency } = useFiatNormalizer();
  const slice = useCollectiblesSlice(toUserCurrency);
  const refresh = useRefreshPackPartnerCards();
  const queryClient = useQueryClient();
  const [completedRefreshes, setCompletedRefreshes] = React.useState(0);
  return (
    <>
      <Text testID="completed-refreshes">{completedRefreshes}</Text>
      <Text testID="collectibles-balance-status">{slice.status}</Text>
      {slice.isVisible && (
        <HomepageBalanceBreakdownRow
          slice={{ ...slice, percentOfTotal: 0 }}
          userCurrency={userCurrency}
          onPress={() => undefined}
        />
      )}
      <Button
        testID="refresh-collection"
        title="Refresh"
        onPress={async () => {
          await refresh();
          setCompletedRefreshes((count) => count + 1);
        }}
      />
      <Button
        testID="invalidate-owned-cards"
        title="Invalidate"
        onPress={() =>
          queryClient.invalidateQueries({
            queryKey: packPartnerQueries.getOwnedCards(
              PACK_PARTNER_ENVIRONMENT,
              MOCK_ACCOUNT.address,
            ).queryKey,
          })
        }
      />
    </>
  );
};
const renderBalance = (
  options: Parameters<typeof renderCollectiblesView>[0] = {},
) =>
  renderCollectiblesView({
    entry: { Component: CollectiblesBalance, name: Routes.WALLET_VIEW },
    ...options,
    overrides: {
      ...options.overrides,
      engine: {
        ...options.overrides?.engine,
        backgroundState: {
          PreferencesController: backgroundState.PreferencesController,
          ...options.overrides?.engine?.backgroundState,
        },
      },
    },
  });
const expectValue = async (value: string): Promise<void> =>
  waitFor(() =>
    expect(screen.getByTestId(ids.VALUE('collectibles'))).toHaveTextContent(
      value,
    ),
  );

describeForPlatforms('Collectibles balance slice', () => {
  beforeEach(() => {
    Object.values(packPartnerReads).forEach((read) => read.mockReset());
  });

  it('converts the complete insured collection into the selected currency', async () => {
    renderBalance({
      ownedCards: Array.from({ length: 8 }, (_, index) =>
        createCard({
          mint: `mint-${index}`,
          insuredValue: 25,
          listedPriceUsd: 999,
        }),
      ),
      usdcAmount: '1000',
      overrides: {
        engine: {
          backgroundState: {
            AssetsController: {
              selectedCurrency: 'eur',
              assetsInfo: {
                'eip155:1/slip44:60': {
                  type: 'native',
                  symbol: 'ETH',
                  name: 'Ether',
                  decimals: 18,
                },
              },
              assetsPrice: {
                'eip155:1/slip44:60': {
                  assetPriceType: 'fungible',
                  price: 1600,
                  usdPrice: 2000,
                  lastUpdated: 1,
                },
              },
            },
          },
        },
      },
    });
    await expectValue('€160.00');
    expect(packPartnerReads.getOwnedCards).toHaveBeenCalledTimes(1);
    expect(packPartnerReads.getBuybackOffer).not.toHaveBeenCalled();
  });

  it('shows loading until the initial collection read completes', async () => {
    const pending = createDeferredPromise<CollectiblesCard[]>();
    packPartnerReads.getOwnedCards.mockReturnValue(pending.promise);
    renderBalance();
    expect(
      await screen.findByTestId(ids.SKELETON('collectibles')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(ids.VALUE('collectibles')),
    ).not.toBeOnTheScreen();

    await act(async () => pending.resolve([createCard({ insuredValue: 13 })]));

    await expectValue('$13.00');
  });

  it('reports an initial read error instead of a zero balance', async () => {
    packPartnerReads.getOwnedCards.mockRejectedValue(new Error('Unavailable'));
    renderBalance();
    await waitFor(() =>
      expect(
        screen.getByTestId('collectibles-balance-status'),
      ).toHaveTextContent('error'),
    );
    await expectValue('—');
  });

  it('keeps the previous insured value until a forced refresh completes', async () => {
    renderBalance({ ownedCards: [createCard({ insuredValue: 13 })] });
    await expectValue('$13.00');
    const updated = createDeferredPromise<CollectiblesCard[]>();
    packPartnerReads.getOwnedCards.mockReturnValue(updated.promise);
    fireEvent.press(screen.getByTestId('refresh-collection'));
    await waitFor(() =>
      expect(packPartnerReads.getOwnedCards).toHaveBeenCalledTimes(2),
    );
    await expectValue('$13.00');
    await act(async () => updated.resolve([createCard({ insuredValue: 49 })]));
    await expectValue('$49.00');
  });

  it('updates to zero when the shared owned-cards query is invalidated after a sale', async () => {
    renderBalance({ ownedCards: [createCard({ insuredValue: 49 })] });
    await expectValue('$49.00');
    packPartnerReads.getOwnedCards.mockResolvedValue([]);
    fireEvent.press(screen.getByTestId('invalidate-owned-cards'));
    await expectValue('$0.00');
  });

  it('keeps a loaded empty collection ready after a refresh error', async () => {
    renderBalance({ ownedCards: [] });
    await expectValue('$0.00');
    packPartnerReads.getOwnedCards.mockRejectedValue(new Error('Unavailable'));
    fireEvent.press(screen.getByTestId('refresh-collection'));
    await waitFor(() =>
      expect(screen.getByTestId('completed-refreshes')).toHaveTextContent('1'),
    );
    await expectValue('$0.00');
    expect(screen.getByTestId('collectibles-balance-status')).toHaveTextContent(
      'ready',
    );
  });

  it.each([{ isEnabled: false }, { hasSolanaAccount: false }])(
    'does not fetch an ineligible collection: %j',
    async (options) => {
      renderBalance(options);
      await waitFor(() =>
        expect(
          screen.getByTestId('collectibles-balance-status'),
        ).toHaveTextContent('ineligible'),
      );
      expect(packPartnerReads.getOwnedCards).not.toHaveBeenCalled();
    },
  );
});
