import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderCollectiblesView } from '../../../../../../tests/component-view/renderers/collectibles';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { DiscoveryCardDetail } from '../CollectiblesCard/DiscoveryCardDetail';
import { CollectiblesPurchaseSheetTestIds } from '../../Collectibles.testIds';
import { packPartnerReads, createPack } from '../testUtils';
import { strings } from '../../../../../../locales/i18n';
import type {
  CollectiblesInventoryCard,
  CollectiblesOpening,
} from '../../types';

const core = createPack({ code: 'pokemon_25', price: 25, category: 'Pokemon' });
const charged = createPack({
  code: 'pokemon_50',
  price: 50,
  category: 'Pokemon',
});
const card: CollectiblesInventoryCard = {
  mint: 'PublicMint',
  name: 'Public card',
  category: 'Pokemon',
};
const controller = {
  generatePack: jest.fn(),
};
const close = jest.fn();

const renderDetail = (
  props: Partial<React.ComponentProps<typeof DiscoveryCardDetail>> = {},
) =>
  renderCollectiblesView({
    entry: {
      name: Routes.COLLECTIBLES.EXPLORE,
      Component: () => (
        <DiscoveryCardDetail card={card} onClose={close} {...props} />
      ),
    },
    usdcAmount: '0',
  });

describeForPlatforms('Public collectibles card purchase entry', () => {
  beforeEach(() => {
    Object.values(controller).forEach((method) => method.mockReset());
    close.mockReset();
    packPartnerReads.getPacks.mockResolvedValue([core, charged]);
    Object.assign(Engine.context, { CollectiblesController: controller });
  });

  it('reviews the original pack without buying and returns to the card when cancelled', async () => {
    renderDetail({ sourcePackType: 'pack_partner:pokemon_50' });
    await waitFor(() =>
      expect(
        screen.getByTestId('collectibles-public-card-buy-pack'),
      ).toBeEnabled(),
    );
    fireEvent.press(screen.getByTestId('collectibles-public-card-buy-pack'));
    expect(
      await screen.findByTestId('collectibles-purchase-amount'),
    ).toHaveTextContent('$50');
    expect(
      screen.getByTestId(CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON),
    ).toBeDisabled();
    expect(controller.generatePack).not.toHaveBeenCalled();
    fireEvent.press(
      screen.getByTestId(CollectiblesPurchaseSheetTestIds.CLOSE_BUTTON),
    );
    expect(
      await screen.findByTestId('collectibles-public-card'),
    ).toBeOnTheScreen();
    expect(close).not.toHaveBeenCalled();
  });

  it('disables buying for an unknown category rather than offering an unrelated pack', async () => {
    renderDetail({ card: { ...card, category: 'Unknown' } });
    await waitFor(() => expect(packPartnerReads.getPacks).toHaveBeenCalled());
    expect(
      screen.getByTestId('collectibles-public-card-buy-pack'),
    ).toBeDisabled();
    expect(
      screen.queryByTestId('collectibles-public-card-source-pack'),
    ).not.toBeOnTheScreen();
  });

  it('keeps another collector’s sale receipt read-only with a neutral proceeds label', async () => {
    renderDetail({ saleReceipt: { amountUsd: 42 } });
    expect(
      await screen.findByTestId('collectibles-public-sale-receipt'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('collectibles_discovery.sale_proceeds')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId('collectibles-public-card-buy-pack'),
    ).not.toBeOnTheScreen();
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('shows the public opener without treating that address as the current owner', async () => {
    const opening: CollectiblesOpening = {
      ...card,
      id: 'opening-1',
      openedAt: Date.parse('2026-10-13T20:00:00Z'),
      openerAddress: 'PublicWalletAddress1234',
    };
    renderDetail({ card: opening });
    expect(
      await screen.findByTestId('collectibles-public-card-context'),
    ).toHaveTextContent(/Opened by Public…1234/);
    expect(
      screen.queryByText(strings('collectibles.card.owner')),
    ).not.toBeOnTheScreen();
  });
});
