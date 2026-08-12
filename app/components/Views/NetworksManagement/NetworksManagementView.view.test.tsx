import '../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Engine from '../../../core/Engine';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import { renderNetworksManagementView } from '../../../../tests/component-view/renderers/networksManagement';
import { renderContactsWithRoutes } from '../../../../tests/component-view/renderers/identity';
import {
  NETWORKS_MGMT_CUSTOM_CHAIN_CONTACT,
  NETWORKS_MGMT_LOCALHOST_CHAIN_ID,
  NETWORKS_MGMT_POLYGON_CHAIN_ID,
  NETWORKS_MGMT_ZKSYNC_CHAIN_ID,
  initialStateAfterLocalhostNetworkDelete,
} from '../../../../tests/component-view/presets/networksManagement';
import { NetworksManagementViewSelectorsIDs } from './NetworksManagementView.testIds';
import { NetworkDetailsViewSelectorsIDs } from './NetworkDetailsView/NetworkDetailsView.testIds';

/** Matches ContactsViewSelectorIDs.CONTAINER without cross-route import (ADR-0020). */
const CONTACTS_SCREEN_TEST_ID = 'contacts-screen';

describeForPlatforms('NetworksManagementView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the network list with Polygon, zkSync, and custom localhost', async () => {
    const { findByTestId } = renderNetworksManagementView();

    expect(
      await findByTestId(NetworksManagementViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();

    expect(
      await findByTestId(
        NetworksManagementViewSelectorsIDs.NETWORK_ITEM(
          NETWORKS_MGMT_POLYGON_CHAIN_ID,
        ),
      ),
    ).toBeOnTheScreen();
    expect(
      await findByTestId(
        NetworksManagementViewSelectorsIDs.NETWORK_ITEM(
          NETWORKS_MGMT_ZKSYNC_CHAIN_ID,
        ),
      ),
    ).toBeOnTheScreen();
    expect(
      await findByTestId(
        NetworksManagementViewSelectorsIDs.NETWORK_ITEM(
          NETWORKS_MGMT_LOCALHOST_CHAIN_ID,
        ),
      ),
    ).toBeOnTheScreen();
  });

  it('does not show remove when viewing the currently selected network', async () => {
    const { findByTestId, queryByTestId } = renderNetworksManagementView({
      overrides: {
        engine: {
          backgroundState: {
            NetworkController: {
              selectedNetworkClientId: 'localhost',
            },
          },
        },
      },
    });

    fireEvent.press(
      await findByTestId(
        NetworksManagementViewSelectorsIDs.NETWORK_ITEM(
          NETWORKS_MGMT_LOCALHOST_CHAIN_ID,
        ),
      ),
    );

    expect(
      await findByTestId(NetworkDetailsViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(NetworkDetailsViewSelectorsIDs.REMOVE_NETWORK_BUTTON),
    ).toBeNull();
  });

  it('removes zkSync Era after confirming delete', async () => {
    const removeNetworkSpy = jest.spyOn(
      Engine.context.NetworkController as { removeNetwork: jest.Mock },
      'removeNetwork',
    );

    const { findByTestId } = renderNetworksManagementView();

    fireEvent.press(
      await findByTestId(
        NetworksManagementViewSelectorsIDs.NETWORK_ITEM(
          NETWORKS_MGMT_ZKSYNC_CHAIN_ID,
        ),
      ),
    );

    fireEvent.press(
      await findByTestId(NetworkDetailsViewSelectorsIDs.REMOVE_NETWORK_BUTTON),
    );

    fireEvent.press(
      await findByTestId(
        NetworksManagementViewSelectorsIDs.DELETE_CONFIRM_BUTTON,
      ),
    );

    await waitFor(() => {
      expect(removeNetworkSpy).toHaveBeenCalledWith(
        NETWORKS_MGMT_ZKSYNC_CHAIN_ID,
      );
    });

    expect(
      await findByTestId(NetworksManagementViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('does not list custom-chain contacts on mainnet after network delete', async () => {
    const state = initialStateAfterLocalhostNetworkDelete().build();
    const { queryByText, findByTestId } = renderContactsWithRoutes({ state });

    expect(await findByTestId(CONTACTS_SCREEN_TEST_ID)).toBeOnTheScreen();
    expect(queryByText(NETWORKS_MGMT_CUSTOM_CHAIN_CONTACT.name)).toBeNull();
  });
});
