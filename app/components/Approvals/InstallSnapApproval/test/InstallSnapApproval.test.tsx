import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import InstallSnapApprovalFlow from '../InstallSnapApprovalFlow';
import {
  SNAP_INSTALL_CANCEL,
  SNAP_INSTALL_CONNECT,
  SNAP_INSTALL_CONNECTION_REQUEST,
  SNAP_INSTALL_ERROR,
  SNAP_INSTALL_PERMISSIONS_REQUEST,
  SNAP_INSTALL_PERMISSIONS_REQUEST_APPROVE,
  SNAP_INSTALL_SUCCESS,
} from '../../../../constants/test-ids';

describe('InstallSnapApprovalFlow', () => {
  const requestData = {
    requestData: {
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
                snaps: false,
              },
            },
          ],
        },
      },
      snapId: 'npm:@lavamoat/tss-snap',
    },
    id: 'uNadWHqPnwOM4NER3mERI',
  };

  const onConfirm = jest.fn();
  const onFinish = jest.fn();
  const onCancel = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders InstallSnapConnectionRequest component initially', () => {
    const { getByTestId } = render(
      <InstallSnapApprovalFlow
        requestData={requestData}
        onConfirm={onConfirm}
        onFinish={onFinish}
        onCancel={onCancel}
      />,
    );
    const connectionRequest = getByTestId(SNAP_INSTALL_CONNECTION_REQUEST);
    expect(connectionRequest).toBeDefined();
  });

  it('switches to InstallSnapPermissionsRequest on confirmation', async () => {
    const { getByTestId, findByTestId } = render(
      <InstallSnapApprovalFlow
        requestData={requestData}
        onConfirm={onConfirm}
        onFinish={onFinish}
        onCancel={onCancel}
      />,
    );
    const confirmButton = getByTestId(SNAP_INSTALL_CONNECT);
    fireEvent.press(confirmButton);
    const permissionsRequest = await findByTestId(
      SNAP_INSTALL_PERMISSIONS_REQUEST,
    );
    expect(permissionsRequest).toBeDefined();
  });

  it('calls onConfirm when Approve button is pressed in InstallSnapPermissionsRequest', async () => {
    const { getByTestId } = render(
      <InstallSnapApprovalFlow
        requestData={requestData}
        onConfirm={onConfirm}
        onFinish={onFinish}
        onCancel={onCancel}
      />,
    );
    const confirmButton = getByTestId(SNAP_INSTALL_CONNECT);
    fireEvent.press(confirmButton);
    const permissionsApproveButton = getByTestId(
      SNAP_INSTALL_PERMISSIONS_REQUEST_APPROVE,
    );
    fireEvent.press(permissionsApproveButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders InstallSnapSuccess on successful installation', async () => {
    const { getByTestId, findByTestId } = render(
      <InstallSnapApprovalFlow
        requestData={requestData}
        onConfirm={onConfirm}
        onFinish={onFinish}
        onCancel={onCancel}
      />,
    );
    const confirmButton = getByTestId(SNAP_INSTALL_CONNECT);
    fireEvent.press(confirmButton);
    const permissionsRequest = await findByTestId(
      SNAP_INSTALL_PERMISSIONS_REQUEST,
    );
    expect(permissionsRequest).toBeDefined();
    const permissionsApproveButton = getByTestId(
      SNAP_INSTALL_PERMISSIONS_REQUEST_APPROVE,
    );
    fireEvent.press(permissionsApproveButton);
    const installSuccess = await findByTestId(SNAP_INSTALL_SUCCESS);
    expect(installSuccess).toBeDefined();
  });

  it('renders InstallSnapError on error during installation', async () => {
    onConfirm.mockImplementation(() => {
      throw new Error('Installation error');
    });

    const { getByTestId, findByTestId } = render(
      <InstallSnapApprovalFlow
        requestData={requestData}
        onConfirm={onConfirm}
        onFinish={onFinish}
        onCancel={onCancel}
      />,
    );
    const confirmButton = getByTestId(SNAP_INSTALL_CONNECT);
    fireEvent.press(confirmButton);
    const permissionsRequest = getByTestId(SNAP_INSTALL_PERMISSIONS_REQUEST);
    expect(permissionsRequest).toBeDefined();
    const permissionsConfirmButton = getByTestId(
      SNAP_INSTALL_PERMISSIONS_REQUEST_APPROVE,
    );
    fireEvent.press(permissionsConfirmButton);
    await waitFor(() => {
      expect(findByTestId(SNAP_INSTALL_ERROR)).toBeDefined();
    });
  });

  it('calls onCancel on cancel button click', () => {
    const { getByTestId } = render(
      <InstallSnapApprovalFlow
        requestData={requestData}
        onConfirm={onConfirm}
        onFinish={onFinish}
        onCancel={onCancel}
      />,
    );
    const cancelButton = getByTestId(SNAP_INSTALL_CANCEL);
    fireEvent.press(cancelButton);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
