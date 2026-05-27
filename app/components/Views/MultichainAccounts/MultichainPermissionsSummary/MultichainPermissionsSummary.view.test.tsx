import '../../../../../tests/component-view/mocks';
import { fireEvent } from '@testing-library/react-native';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import { renderMultichainPermissionsSummary } from '../../../../../tests/component-view/renderers/multichainAccounts';
import { CommonSelectorsIDs } from '../../../../util/Common.testIds';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { ConnectedAccountsSelectorsIDs } from '../../AccountConnect/ConnectedAccountModal.testIds';
import {
  PermissionSummaryBottomSheetSelectorsIDs,
  PermissionSummaryBottomSheetSelectorsText,
  // eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
} from '../../AccountConnect/PermissionSummaryBottomSheet.testIds';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { NetworkNonPemittedBottomSheetSelectorsIDs } from '../../NetworkConnect/NetworkNonPemittedBottomSheet.testIds';
import { strings } from '../../../../../locales/i18n';

describeForPlatforms('MultichainPermissionsSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows only connected account permissions and handles account actions', () => {
    const onEdit = jest.fn();
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    const { getByTestId, getByText, queryByTestId } =
      renderMultichainPermissionsSummary({
        props: {
          showAccountsOnly: true,
          onEdit,
          onCancel,
          onConfirm,
        },
      });

    expect(
      getByText(
        strings('permissions.title_dapp_url_has_approval_to', {
          dappUrl: 'https://portfolio.metamask.io',
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('permissions.see_your_accounts')),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        PermissionSummaryBottomSheetSelectorsIDs.ACCOUNT_PERMISSION_CONTAINER,
      ),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(
        ConnectedAccountsSelectorsIDs.NAVIGATE_TO_EDIT_NETWORKS_PERMISSIONS_BUTTON,
      ),
    ).not.toBeOnTheScreen();

    fireEvent.press(
      getByTestId(PermissionSummaryBottomSheetSelectorsIDs.CONTAINER),
    );
    fireEvent.press(getByTestId(CommonSelectorsIDs.CANCEL_BUTTON));
    fireEvent.press(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows only connected network permissions and handles edit action', () => {
    const onEditNetworks = jest.fn();
    const { getByTestId, getByText, queryByTestId } =
      renderMultichainPermissionsSummary({
        props: {
          showPermissionsOnly: true,
          onEditNetworks,
        },
      });

    expect(
      getByText(strings('permissions.use_enabled_networks')),
    ).toBeOnTheScreen();
    expect(
      getByText(
        PermissionSummaryBottomSheetSelectorsText.ETHEREUM_MAINNET_LABEL,
      ),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(PermissionSummaryBottomSheetSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();

    fireEvent.press(
      getByTestId(
        ConnectedAccountsSelectorsIDs.NAVIGATE_TO_EDIT_NETWORKS_PERMISSIONS_BUTTON,
      ),
    );

    expect(onEditNetworks).toHaveBeenCalledTimes(1);
  });

  it('shows non-dapp network switch guidance and actions', () => {
    const onAddNetwork = jest.fn();
    const onChooseFromPermittedNetworks = jest.fn();
    const { getByTestId, getByText, queryByTestId } =
      renderMultichainPermissionsSummary({
        props: {
          isNonDappNetworkSwitch: true,
          showPermissionsOnly: true,
          selectedAccountGroupIds: [],
          networkAvatars: [],
          onAddNetwork,
          onChooseFromPermittedNetworks,
        },
      });

    expect(
      getByText(strings('permissions.title_add_network_permission')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('permissions.non_permitted_network_description')),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(PermissionSummaryBottomSheetSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();

    fireEvent.press(
      getByTestId(
        NetworkNonPemittedBottomSheetSelectorsIDs.ADD_THIS_NETWORK_BUTTON,
      ),
    );
    fireEvent.press(
      getByTestId(
        NetworkNonPemittedBottomSheetSelectorsIDs.CHOOSE_FROM_PERMITTED_NETWORKS_BUTTON,
      ),
    );

    expect(onAddNetwork).toHaveBeenCalledTimes(1);
    expect(onChooseFromPermittedNetworks).toHaveBeenCalledTimes(1);
  });
});
