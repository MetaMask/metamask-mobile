import '../../../../../../tests/component-view/mocks';
import { fireEvent, screen } from '@testing-library/react-native';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderGachaView } from '../../../../../../tests/component-view/renderers/gacha';
import {
  GachaCardsTestIds,
  GachaHomeTestIds,
  GachaPacksTestIds,
} from '../../Gacha.testIds';

describeForPlatforms('GachaHome', () => {
  it('switches from Packs to My cards and back', async () => {
    renderGachaView();
    expect(await screen.findByTestId(GachaPacksTestIds.LIST)).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(GachaHomeTestIds.CARDS_TAB));

    expect(await screen.findByTestId(GachaCardsTestIds.LIST)).toBeOnTheScreen();
    expect(screen.queryByTestId(GachaPacksTestIds.LIST)).not.toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(GachaHomeTestIds.PACKS_TAB));

    expect(await screen.findByTestId(GachaPacksTestIds.LIST)).toBeOnTheScreen();
    expect(screen.queryByTestId(GachaCardsTestIds.LIST)).not.toBeOnTheScreen();
  });

  it('can switch to Packs after opening My cards through route params', async () => {
    renderGachaView({ initialTab: 'cards' });
    expect(await screen.findByTestId(GachaCardsTestIds.LIST)).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(GachaHomeTestIds.PACKS_TAB));

    expect(await screen.findByTestId(GachaPacksTestIds.LIST)).toBeOnTheScreen();
    expect(screen.queryByTestId(GachaCardsTestIds.LIST)).not.toBeOnTheScreen();
  });
});
