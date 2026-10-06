import '../../../../../../tests/component-view/mocks';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderGachaSectionWithRoutes } from '../../../../../../tests/component-view/renderers/gacha';
import Engine from '../../../../../core/Engine';
import { updateBgState } from '../../../../../core/redux/slices/engine';
import {
  GachaHomeTestIds,
  GachaPacksTestIds,
} from '../../../../UI/Gacha/Gacha.testIds';
import { homepageSectionTitleTestId } from '../../Homepage.testIds';
import { HomeSectionNames } from '../../hooks/useHomeViewedEvent';
import { GachaSectionTestIds } from './GachaSection.testIds';

describeForPlatforms('GachaSection', () => {
  it.each([
    {
      entry: 'title',
      testID: homepageSectionTitleTestId(HomeSectionNames.GACHA),
    },
    { entry: 'button', testID: GachaSectionTestIds.EMPTY_CTA },
  ])(
    'opens Packs from the $entry and returns to the section',
    async ({ testID }) => {
      renderGachaSectionWithRoutes();

      fireEvent.press(await screen.findByTestId(testID));

      expect(
        await screen.findByTestId(GachaPacksTestIds.LIST),
      ).toBeOnTheScreen();

      fireEvent.press(screen.getByTestId(GachaHomeTestIds.BACK_BUTTON));

      expect(
        await screen.findByTestId(GachaSectionTestIds.CONTAINER),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(strings('gacha.home_section.empty')),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(GachaHomeTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    },
  );

  it('hides the section when the remote flag is disabled', async () => {
    const { store } = renderGachaSectionWithRoutes();
    await screen.findByTestId(GachaSectionTestIds.CONTAINER);

    act(() => {
      Object.assign(Engine, {
        state: {
          ...store.getState().engine.backgroundState,
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              gachaEnabled: { enabled: false, minimumVersion: '0.0.1' },
            },
          },
        },
      });
      store.dispatch(updateBgState({ key: 'RemoteFeatureFlagController' }));
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId(GachaSectionTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });
  });
});
