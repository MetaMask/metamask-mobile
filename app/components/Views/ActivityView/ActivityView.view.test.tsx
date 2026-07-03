import '../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../locales/i18n';
import type { DeepPartial } from '../../../util/test/renderWithProvider';
import type { RootState } from '../../../reducers';
import Routes from '../../../constants/navigation/Routes';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import {
  renderActivityView,
  renderActivityViewWithRoutes,
} from '../../../../tests/component-view/renderers/activity';
import { getRouteProbeTestId } from '../../../../tests/component-view/render';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletViewSelectorsIDs } from '../Wallet/WalletView.testIds';

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
  it('opens network manager when the legacy network filter is pressed', async () => {
    const { getByTestId, findByTestId } = renderActivityViewWithRoutes({
      overrides: legacyActivityViewState,
      extraRoutes: [{ name: Routes.MODAL.ROOT_MODAL_FLOW }],
    });

    const networkFilter = await waitFor(() =>
      getByTestId(WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER),
    );

    fireEvent.press(networkFilter);

    expect(
      await findByTestId(getRouteProbeTestId(Routes.MODAL.ROOT_MODAL_FLOW)),
    ).toBeOnTheScreen();
  });

  it('types in search after the redesigned screen lazy-loads', async () => {
    const { findByPlaceholderText } = renderActivityView({
      redesignEnabled: true,
    });

    const searchInput = await waitFor(() =>
      findByPlaceholderText(strings('activity_view.search_placeholder')),
    );

    fireEvent.changeText(searchInput, 'swap');

    expect(searchInput).toHaveProp('value', 'swap');
  });
});
