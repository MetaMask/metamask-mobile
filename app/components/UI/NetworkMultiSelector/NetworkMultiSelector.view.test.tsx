import '../../../../tests/component-view/mocks';
import { renderNetworkMultiSelector } from '../../../../tests/component-view/renderers/networkManager';
import { ENABLED_NETWORKS } from '../../../../tests/component-view/presets/networkManager';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { NETWORK_MULTI_SELECTOR_TEST_IDS } from './NetworkMultiSelector.constants';

describeForPlatforms('NetworkMultiSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // E2E test 4: "should select a network and deselect the previous selected network"
  // Proves: tapping a popular network updates the local (Redux-free) selection
  // and deselects the previously selected network - no Redux write involved.
  it('tapping a network updates the local selection and deselects the previous one', async () => {
    const { findByTestId } = renderNetworkMultiSelector({
      enabledNetworks: ENABLED_NETWORKS.ALL_POPULAR,
      initialLocalSelectedChainIds: ['eip155:1'],
    });

    const arbitrumItem = await findByTestId(
      NETWORK_MULTI_SELECTOR_TEST_IDS.NETWORK_LIST_ITEM('eip155:42161', false),
    );

    fireEvent.press(arbitrumItem);

    await waitFor(async () => {
      await findByTestId(
        NETWORK_MULTI_SELECTOR_TEST_IDS.NETWORK_LIST_ITEM('eip155:42161', true),
      );
      await findByTestId(
        NETWORK_MULTI_SELECTOR_TEST_IDS.NETWORK_LIST_ITEM('eip155:1', false),
      );
    });
  });

  // E2E tests 2+3: "should reflect the correct enabled networks state"
  // Proves: Select All toggle switches the local selection back to "all networks".
  it('pressing Select All switches the local selection to all popular networks', async () => {
    const { findByTestId } = renderNetworkMultiSelector({
      enabledNetworks: ENABLED_NETWORKS.ETHEREUM_ONLY,
      initialLocalSelectedChainIds: ['eip155:1'],
    });

    const selectAllNotSelected = await findByTestId(
      NETWORK_MULTI_SELECTOR_TEST_IDS.SELECT_ALL_POPULAR_NETWORKS_NOT_SELECTED,
    );

    fireEvent.press(selectAllNotSelected);

    await waitFor(async () => {
      await findByTestId(
        NETWORK_MULTI_SELECTOR_TEST_IDS.SELECT_ALL_POPULAR_NETWORKS_SELECTED,
      );
    });
  });

  // E2E tests 5+6: tab defaulting
  // Proves: popular networks container renders and reflects the locally
  // selected network as "selected" without requiring a Redux write.
  it('popular networks container is visible and reflects the local selection', async () => {
    const { findByTestId } = renderNetworkMultiSelector({
      activeEvmChainId: '0x1',
      enabledNetworks: ENABLED_NETWORKS.ETHEREUM_ONLY,
      initialLocalSelectedChainIds: ['eip155:1'],
    });

    const container = await findByTestId(
      NETWORK_MULTI_SELECTOR_TEST_IDS.POPULAR_NETWORKS_CONTAINER,
    );
    expect(container).toBeOnTheScreen();

    // Ethereum is the locally selected network, so it shows as "selected"
    const ethereumItem = await findByTestId(
      NETWORK_MULTI_SELECTOR_TEST_IDS.NETWORK_LIST_ITEM('eip155:1', true),
    );
    expect(ethereumItem).toBeOnTheScreen();
  });
});
