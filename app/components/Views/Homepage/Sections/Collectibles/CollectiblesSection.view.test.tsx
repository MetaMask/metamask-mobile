import '../../../../../../tests/component-view/mocks';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  createCollectiblesFlagHarness,
  renderHomepageWithCollectibles,
} from '../../../../../../tests/component-view/renderers/collectibles';
import { CollectiblesHomeTestIds } from '../../../../UI/Collectibles';
import { homepageSectionTitleTestId } from '../../Homepage.testIds';
import { HomeSectionNames } from '../../hooks/useHomeViewedEvent';
import { collectiblesTestIds } from '../../../../UI/Collectibles/Collectibles.testIds';

describeForPlatforms('Collectibles on the wallet homepage', () => {
  const netInfo = NetInfo as unknown as typeof NetInfoMock;
  beforeEach(() => {
    netInfo.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
  });
  afterEach(() => netInfo.__resetMockNetInfo());

  it('opens Collectibles from the homepage title and returns to the carousel', async () => {
    renderHomepageWithCollectibles();

    const title = homepageSectionTitleTestId(HomeSectionNames.COLLECTIBLES);
    await screen.findByTestId(title);
    fireEvent.press(screen.getByTestId(title));

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
        screen.getByTestId(collectiblesTestIds.homeSection),
      ).toBeOnTheScreen();
    });
    expect(
      screen.queryByTestId(CollectiblesHomeTestIds.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  // Unlike the unit flag gate, this checks a live kill switch after the section
  // is visible, without remounting the homepage.
  it('removes the visible section when the remote flag is disabled while the homepage is open', async () => {
    const { store } = renderHomepageWithCollectibles();
    const { setEnabled, cleanup } = createCollectiblesFlagHarness(store);

    try {
      await screen.findByTestId(collectiblesTestIds.homeSection);

      act(() => setEnabled(false));

      await waitFor(() => {
        expect(
          screen.queryByTestId(collectiblesTestIds.homeSection),
        ).not.toBeOnTheScreen();
      });
    } finally {
      cleanup();
    }
  });
});
