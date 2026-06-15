import '../../../../tests/component-view/mocks';
import { waitFor } from '@testing-library/react-native';
import { strings } from '../../../../locales/i18n';
import type { DeepPartial } from '../../../util/test/renderWithProvider';
import type { RootState } from '../../../reducers';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import { renderActivityView } from '../../../../tests/component-view/renderers/activity';
import { ActivitiesViewSelectorsIDs } from './ActivitiesView.testIds';

const legacyActivityViewState = {
  engine: {
    backgroundState: {
      NetworkEnablementController: {
        enabledNetworkMap: {
          eip155: { '0x1': true },
          solana: {},
        },
      },
    },
  },
} as unknown as DeepPartial<RootState>;

describeForPlatforms('ActivityView', () => {
  it('renders the legacy activity shell when the redesign flag is off', () => {
    const { getByTestId, queryByTestId } = renderActivityView({
      overrides: legacyActivityViewState,
    });

    expect(
      getByTestId(ActivitiesViewSelectorsIDs.SAFE_AREA_VIEW),
    ).toBeOnTheScreen();
    expect(
      queryByPlaceholderText(strings('activity_view.search_placeholder')),
    ).not.toBeOnTheScreen();
  });

  it('renders the redesigned activity screen when the redesign flag is on', async () => {
    const { queryByTestId, findByPlaceholderText } = renderActivityView({
      redesignEnabled: true,
    });

    expect(
      queryByTestId(ActivitiesViewSelectorsIDs.SAFE_AREA_VIEW),
    ).not.toBeOnTheScreen();

    await waitFor(async () => {
      expect(
        await findByPlaceholderText(
          strings('activity_view.search_placeholder'),
        ),
      ).toBeOnTheScreen();
    });
  });
});
