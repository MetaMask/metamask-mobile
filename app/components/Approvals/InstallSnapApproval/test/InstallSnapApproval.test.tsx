import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ApprovalRequest } from '@metamask/approval-controller';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import InstallSnapApproval from '../InstallSnapApproval';
import useApprovalRequest from '../../../Views/confirmations/hooks/useApprovalRequest';
import {
  SNAP_INSTALL_CANCEL,
  SNAP_INSTALL_CONNECTION_REQUEST,
} from '../components/InstallSnapConnectionRequest/InstallSnapConnectionRequest.constants';
import {
  SNAP_INSTALL_PERMISSIONS_REQUEST,
  SNAP_INSTALL_PERMISSIONS_REQUEST_APPROVE,
} from '../components/InstallSnapPermissionsRequest/InstallSnapPermissionsRequest.constants';
import SNAP_INSTALL_SUCCESS from '../components/InstallSnapSuccess/InstallSnapSuccess.constants';
import SNAP_INSTALL_ERROR from '../components/InstallSnapError/InstallSnapError.constants';

jest.mock('../../../Views/confirmations/hooks/useApprovalRequest');

const onConfirm = jest.fn();
const onReject = jest.fn();

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockApprovalRequest = (approvalRequest?: ApprovalRequest<any>) => {
  (
    useApprovalRequest as jest.MockedFn<typeof useApprovalRequest>
  ).mockReturnValue({
    approvalRequest,
    onConfirm,
    onReject,
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

describe('InstallSnapApprovalFlow', () => {
  const requestPermissionsData = {
    id: 'jUU9-fsMO1dkSAKdKxiK_',
    origin: 'metamask.github.io',
    type: 'wallet_requestPermissions',
    time: 1699041698637,
    requestData: {
      metadata: {
        id: 'jUU9-fsMO1dkSAKdKxiK_',
        origin: 'metamask.github.io',
      },
      permissions: {
        wallet_snap: {
          caveats: [
            {
              type: 'snapIds',
              value: {
                'npm:@metamask/bip32-example-snap': {
                  version: '1.0.0',
                },
              },
            },
          ],
        },
      },
    },
    requestState: null,
    expectsResult: false,
  };

  const installSnapData = {
    id: '-pRxqpl57ssM5nc31C9_9',
    origin: 'metamask.github.io',
    type: 'wallet_installSnap',
    time: 1699045159224,
    requestData: {
      metadata: {
        id: '-pRxqpl57ssM5nc31C9_9',
        origin: 'npm:@metamask/bip32-example-snap',
        dappOrigin: 'metamask.github.io',
      },
      snapId: 'npm:@metamask/bip32-example-snap',
    },
    requestState: {
      loading: false,
      permissions: {
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
        snap_dialog: {},
        snap_getBip32Entropy: {
          caveats: [
            {
              type: 'permittedDerivationPaths',
              value: [
                {
                  path: ['m', "44'", "0'"],
                  curve: 'secp256k1',
                },
                {
                  path: ['m', "44'", "0'"],
                  curve: 'ed25519',
                },
              ],
            },
          ],
        },
        snap_getBip32PublicKey: {
          caveats: [
            {
              type: 'permittedDerivationPaths',
              value: [
                {
                  path: ['m', "44'", "0'"],
                  curve: 'secp256k1',
                },
              ],
            },
          ],
        },
      },
    },
    expectsResult: false,
  };

  const mockStore = configureMockStore();
  const mockInitialState = {
    settings: {},
    engine: {
      backgroundState: {
        PermissionController: {
          subjects: {},
        },
        SubjectMetadataController: {
          subjectMetadata: {},
        },
        SnapController: {
          snaps: {},
        },
      },
    },
  };
  const store = mockStore(mockInitialState);

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Wrapper = ({ children }: any) => (
    <Provider store={store}>{children}</Provider>
  );

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders InstallSnapConnectionRequest component initially when approval type is wallet_requestPermissions', () => {
    mockApprovalRequest(requestPermissionsData);
    const { getByTestId } = render(<InstallSnapApproval />, {
      wrapper: Wrapper,
    });
    const connectionRequest = getByTestId(SNAP_INSTALL_CONNECTION_REQUEST);
    expect(connectionRequest).toBeDefined();
  });

  it('renders InstallSnapPermissionsRequest when approval type is wallet_installSnap', async () => {
    mockApprovalRequest(installSnapData);
    const { findByTestId } = render(<InstallSnapApproval />, {
      wrapper: Wrapper,
    });
    const permissionsRequest = await findByTestId(
      SNAP_INSTALL_PERMISSIONS_REQUEST,
    );
    expect(permissionsRequest).toBeDefined();
  });

  it('calls onConfirm when Approve button is pressed in InstallSnapPermissionsRequest', async () => {
    mockApprovalRequest(installSnapData);
    const { getByTestId } = render(<InstallSnapApproval />, {
      wrapper: Wrapper,
    });
    const permissionsApproveButton = getByTestId(
      SNAP_INSTALL_PERMISSIONS_REQUEST_APPROVE,
    );
    fireEvent.press(permissionsApproveButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders InstallSnapSuccess on successful installation', async () => {
    mockApprovalRequest(installSnapData);
    const { getByTestId, findByTestId } = render(<InstallSnapApproval />, {
      wrapper: Wrapper,
    });
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
    mockApprovalRequest(installSnapData);
    onConfirm.mockImplementation(() => {
      throw new Error('Installation error');
    });

    const { getByTestId } = render(<InstallSnapApproval />, {
      wrapper: Wrapper,
    });
    const permissionsRequest = getByTestId(SNAP_INSTALL_PERMISSIONS_REQUEST);
    expect(permissionsRequest).toBeDefined();
    const permissionsConfirmButton = getByTestId(
      SNAP_INSTALL_PERMISSIONS_REQUEST_APPROVE,
    );
    fireEvent.press(permissionsConfirmButton);
    await waitFor(() => expect(getByTestId(SNAP_INSTALL_ERROR)).toBeDefined());
  });

  it('calls onCancel on cancel button click', () => {
    mockApprovalRequest(installSnapData);
    const { getByTestId } = render(<InstallSnapApproval />, {
      wrapper: Wrapper,
    });
    const cancelButton = getByTestId(SNAP_INSTALL_CANCEL);
    fireEvent.press(cancelButton);
    expect(onReject).toHaveBeenCalledTimes(1);
  });
});
