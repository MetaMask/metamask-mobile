import '../../../../../../tests/component-view/mocks';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderCollectiblesSectionWithRoutes } from '../../../../../../tests/component-view/renderers/collectibles';
import Engine from '../../../../../core/Engine';
import { updateBgState } from '../../../../../core/redux/slices/engine';
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

      expect(
        await screen.findByText(
          strings('collectibles.home_section.open_collectibles'),
        ),
      ).toBeOnTheScreen();
      fireEvent.press(await screen.findByTestId(testID));

      expect(
        await screen.findByTestId(CollectiblesHomeTestIds.CONTAINER),
      ).toBeOnTheScreen();
      expect(screen.getByText(strings('collectibles.title'))).toBeOnTheScreen();
      expect(screen.queryByRole('tab')).not.toBeOnTheScreen();

      fireEvent.press(screen.getByTestId(CollectiblesHomeTestIds.BACK_BUTTON));

      expect(
        await screen.findByTestId(CollectiblesSectionTestIds.CONTAINER),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(strings('collectibles.home_section.description')),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(CollectiblesHomeTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    },
  );

  it('hides the section when the remote flag is disabled', async () => {
    const { store } = renderCollectiblesSectionWithRoutes();
    await screen.findByTestId(CollectiblesSectionTestIds.CONTAINER);

    act(() => {
      Object.assign(Engine, {
        state: {
          ...store.getState().engine.backgroundState,
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              collectiblesEnabled: { enabled: false, minimumVersion: '0.0.1' },
            },
          },
        },
      });
      store.dispatch(updateBgState({ key: 'RemoteFeatureFlagController' }));
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId(CollectiblesSectionTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });
  });
});
