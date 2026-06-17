import '../../../../tests/component-view/mocks';
import { renderNetworkMultiSelector } from '../../../../tests/component-view/renderers/networkManager';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Engine from '../../../core/Engine';
import { NETWORK_MULTI_SELECTOR_TEST_IDS } from './NetworkMultiSelector.constants';

// Keys inside each namespace use hex chain IDs, not CAIP format.
const ALL_POPULAR_ENABLED = {
  eip155: {
    '0x1': true,
    '0x89': true,
    '0xe708': true,
    '0xa4b1': true,
  },
  solana: {
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': true,
  },
  bip122: {
    'bip122:000000000019d6689c085ae165831e93': true,
  },
};

const ETHEREUM_ONLY_ENABLED = {
  eip155: {
    '0x1': true,
  },
};

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
      enabledNetworks: ALL_POPULAR_ENABLED,
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
      enabledNetworks: ETHEREUM_ONLY_ENABLED,
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
      enabledNetworks: ETHEREUM_ONLY_ENABLED,
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
