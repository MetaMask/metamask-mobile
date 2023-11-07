import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import InstallSnapSuccess from '../InstallSnapSuccess';
import {
  SNAP_INSTALL_OK,
  SNAP_INSTALL_SUCCESS,
} from '../../../../../../constants/test-ids';

describe('InstallSnapSuccess', () => {
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByTestId } = render(
      <InstallSnapSuccess
        approvalRequest={installSnapDataApprovalRequest}
        onConfirm={onConfirm}
      />,
    );

    expect(getByTestId(SNAP_INSTALL_SUCCESS)).toBeDefined();
  });

  it('calls onConfirm when the OK button is pressed', () => {
    const { getByTestId } = render(
      <InstallSnapSuccess
        approvalRequest={installSnapDataApprovalRequest}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.press(getByTestId(SNAP_INSTALL_OK));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('displays the correct snap name', () => {
    const { getByText } = render(
      <InstallSnapSuccess
        approvalRequest={installSnapDataApprovalRequest}
        onConfirm={onConfirm}
      />,
    );

    const expectedSnapName = '@lavamoat/tss-snap';
    expect(getByText(expectedSnapName)).toBeTruthy();
  });
});
