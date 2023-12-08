///: BEGIN:ONLY_INCLUDE_IF(snaps)
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import InstallSnapError from '../InstallSnapError';
import SNAP_INSTALL_ERROR from '../InstallSnapError.constants';
import { SNAP_INSTALL_OK } from '../../../InstallSnapApproval.constants';

describe('InstallSnapError', () => {
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
  const error = new Error('Installation failed');

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByTestId } = render(
      <InstallSnapError
        approvalRequest={installSnapDataApprovalRequest}
        onConfirm={onConfirm}
        error={error}
      />,
    );

    expect(getByTestId(SNAP_INSTALL_ERROR)).toBeTruthy();
  });

  it('calls onConfirm when the OK button is pressed', () => {
    const { getByTestId } = render(
      <InstallSnapError
        approvalRequest={installSnapDataApprovalRequest}
        onConfirm={onConfirm}
        error={error}
      />,
    );

    fireEvent.press(getByTestId(SNAP_INSTALL_OK));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('displays the correct snap name', () => {
    const { getByText } = render(
      <InstallSnapError
        approvalRequest={installSnapDataApprovalRequest}
        onConfirm={onConfirm}
        error={error}
      />,
    );

    const expectedSnapName = '@lavamoat/tss-snap';
    expect(getByText(expectedSnapName)).toBeTruthy();
  });

  it('displays the correct error title', () => {
    const { getByText } = render(
      <InstallSnapError
        approvalRequest={installSnapDataApprovalRequest}
        onConfirm={onConfirm}
        error={error}
      />,
    );

    expect(getByText('Installation failed')).toBeTruthy();
  });
});
///: END:ONLY_INCLUDE_IF
