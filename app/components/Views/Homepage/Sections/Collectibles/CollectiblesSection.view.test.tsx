import '../../../../../../tests/component-view/mocks';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  createCollectiblesFlagHarness,
  renderCollectiblesSectionWithRoutes,
} from '../../../../../../tests/component-view/renderers/collectibles';
import { CollectiblesHomeTestIds } from '../../../../UI/Collectibles';
import { homepageSectionTitleTestId } from '../../Homepage.testIds';
import { HomeSectionNames } from '../../hooks/useHomeViewedEvent';
import { CollectiblesSectionTestIds } from './CollectiblesSection.testIds';

describeForPlatforms('CollectiblesSection', () => {
  it.each([
    {
      entry: 'title',
      testID: homepageSectionTitleTestId(HomeSectionNames.COLLECTIBLES),
    },
    { entry: 'button', testID: CollectiblesSectionTestIds.CTA },
  ])(
    'opens Collectibles from the $entry and returns to the section',
    async ({ testID }) => {
      renderCollectiblesSectionWithRoutes();

      await screen.findByText(
        strings('collectibles.home_section.open_collectibles'),
      );
      fireEvent.press(screen.getByTestId(testID));

      await waitFor(() => {
        expect(
          screen.getByTestId(CollectiblesHomeTestIds.CONTAINER),
        ).toBeOnTheScreen();
      });
      expect(screen.getByText(strings('collectibles.title'))).toBeOnTheScreen();
      expect(screen.queryByRole('tab')).not.toBeOnTheScreen();

      fireEvent.press(screen.getByTestId(CollectiblesHomeTestIds.BACK_BUTTON));

      await waitFor(() => {
        expect(
          screen.getByTestId(CollectiblesSectionTestIds.CONTAINER),
        ).toBeOnTheScreen();
      });
      expect(
        screen.getByText(strings('collectibles.home_section.description')),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(CollectiblesHomeTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    },
  );

  // Unlike the unit flag gate, this checks a live kill switch after the section
  // is visible, without remounting the homepage.
  it('removes the visible section when the remote flag is disabled while the homepage is open', async () => {
    const { store } = renderCollectiblesSectionWithRoutes();
    const { setEnabled, cleanup } = createCollectiblesFlagHarness(store);

    try {
      await screen.findByTestId(CollectiblesSectionTestIds.CONTAINER);

      act(() => setEnabled(false));

      await waitFor(() => {
        expect(
          screen.queryByTestId(CollectiblesSectionTestIds.CONTAINER),
        ).not.toBeOnTheScreen();
      });
    } finally {
      cleanup();
    }
  });
});
