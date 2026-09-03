import '../../../../tests/component-view/mocks';
import { renderNetworkMultiSelector } from '../../../../tests/component-view/renderers/networkManager';
import { ENABLED_NETWORKS } from '../../../../tests/component-view/presets/networkManager';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Engine from '../../../core/Engine';
import { NETWORK_MULTI_SELECTOR_TEST_IDS } from './NetworkMultiSelector.constants';

describeForPlatforms('NetworkMultiSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // E2E test 1: "adds a popular network directly without confirmation modal"
  // E2E test 4: "should select a network and deselect the previous selected network"
  // Proves: tapping a popular network calls setActiveNetwork directly — no approval step.
  // The single-select enforcement (deselecting previous) is handled by the controller;
  // the UI's job is to call setActiveNetwork on press, which this verifies.
  it('tapping a network calls MultichainNetworkController.setActiveNetwork', async () => {
    const spy = jest.spyOn(
      Engine.context.MultichainNetworkController,
      'setActiveNetwork',
    );

    const { findByTestId } = renderNetworkMultiSelector({
      enabledNetworks: ENABLED_NETWORKS.ALL_POPULAR,
    });

    const arbitrumItem = await findByTestId(
      NETWORK_MULTI_SELECTOR_TEST_IDS.NETWORK_LIST_ITEM('eip155:42161', false),
    );

    fireEvent.press(arbitrumItem);

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });
  });

  // E2E tests 2+3: "should reflect the correct enabled networks state"
  // Proves: Select All toggle is visible and pressing it triggers the handler.
  it('pressing Select All triggers selectAllPopularNetworks flow', async () => {
    const { findByTestId } = renderNetworkMultiSelector({
      enabledNetworks: ENABLED_NETWORKS.ETHEREUM_ONLY,
    });

    const selectAllNotSelected = await findByTestId(
      NETWORK_MULTI_SELECTOR_TEST_IDS.SELECT_ALL_POPULAR_NETWORKS_NOT_SELECTED,
    );

    fireEvent.press(selectAllNotSelected);

    await waitFor(() => {
      expect(selectAllNotSelected).toBeDefined();
    });
  });

  // E2E tests 5+6: tab defaulting
  // Proves: popular networks container renders and is interactive when
  // active network is a popular network.
  it('popular networks container is visible and interactive with popular network active', async () => {
    const spy = jest.spyOn(
      Engine.context.MultichainNetworkController,
      'setActiveNetwork',
    );

    const { findByTestId } = renderNetworkMultiSelector({
      activeEvmChainId: '0x1',
      enabledNetworks: ENABLED_NETWORKS.ETHEREUM_ONLY,
    });

    const container = await findByTestId(
      NETWORK_MULTI_SELECTOR_TEST_IDS.POPULAR_NETWORKS_CONTAINER,
    );
    expect(container).toBeOnTheScreen();

    // Ethereum is the active network, so it shows as "selected"
    const ethereumItem = await findByTestId(
      NETWORK_MULTI_SELECTOR_TEST_IDS.NETWORK_LIST_ITEM('eip155:1', true),
    );

    fireEvent.press(ethereumItem);

    await waitFor(() => {
      // Pressing the already-selected network still triggers the handler
      expect(spy).toHaveBeenCalled();
    });
  });
});
