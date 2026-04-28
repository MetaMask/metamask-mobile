///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
import React from 'react';
import { render } from '@testing-library/react-native';
import InstallSnapPermissionsRequest from '../InstallSnapPermissionsRequest';
import { SNAP_PERMISSION_CELL } from '../../../../../Views/Snaps/components/SnapPermissionCell/SnapPermissionCell.constants';

describe('InstallSnapPermissionsRequest', () => {
  const installSnapDataApprovalRequest = {
    id: '-pRxqpl57ssM5nc31C9_9',
    origin: 'tss.ac',
    type: 'wallet_installSnap',
    time: 1699045159224,
    requestData: {
      metadata: {
        id: '-pRxqpl57ssM5nc31C9_9',
        origin: 'npm:@lavamoat/tss-snap',
        dappOrigin: 'tss.ac',
      },
      snapId: 'npm:@lavamoat/tss-snap',
    },
    requestState: {
      loading: false,
      permissions: {
        snap_manageState: {},
        'endowment:rpc': {
          caveats: [
            {
              type: 'rpcOrigin',
              value: {
                dapps: true,
                snaps: true,
              },
            },
          ],
        },
      },
    },
    expectsResult: false,
  };

  const onConfirm = jest.fn();
  const onCancel = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the correct number of permission cells', () => {
    const { getAllByTestId } = render(
      <InstallSnapPermissionsRequest
        snapName="@lavamoat/tss-snap"
        approvalRequest={installSnapDataApprovalRequest}
        onConfirm={onConfirm}
        onCancel={onCancel}
        snapId="mockId"
      />,
    );
    const permissionCells = getAllByTestId(SNAP_PERMISSION_CELL);
    expect(permissionCells).toHaveLength(3);
  });
});
///: END:ONLY_INCLUDE_IF
