import React from 'react';
import { render } from '@testing-library/react-native';
import InstallSnapPermissionsRequest from '../InstallSnapPermissionsRequest';
import { SNAP_PERMISSION_CELL } from '../../../../../../constants/test-ids';

describe('InstallSnapPermissionsRequest', () => {
  const requestData = {
    metadata: {
      id: 'uNadWHqPnwOM4NER3mERI',
      origin: 'npm:@lavamoat/tss-snap',
      dappOrigin: 'tss.ac',
    },
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
    snapId: 'npm:@lavamoat/tss-snap',
  };

  const onConfirm = jest.fn();
  const onCancel = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the correct number of permission cells', () => {
    const { getAllByTestId } = render(
      <InstallSnapPermissionsRequest
        requestData={requestData}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    const permissionCells = getAllByTestId(SNAP_PERMISSION_CELL);
    expect(permissionCells).toHaveLength(3);
  });
});
