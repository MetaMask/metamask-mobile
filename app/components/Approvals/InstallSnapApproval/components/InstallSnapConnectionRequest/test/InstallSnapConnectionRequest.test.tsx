///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import InstallSnapConnectionRequest from '../InstallSnapConnectionRequest';
import {
  SNAP_INSTALL_CANCEL,
  SNAP_INSTALL_CONNECT,
  SNAP_INSTALL_CONNECTION_REQUEST,
} from '../InstallSnapConnectionRequest.constants';

describe('InstallSnapConnectionRequest', () => {
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

  const onConfirm = jest.fn();
  const onCancel = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByTestId } = render(
      <InstallSnapConnectionRequest
        approvalRequest={requestPermissionsData}
        onConfirm={onConfirm}
        onCancel={onCancel}
        snapName="@metamask/bip32-example-snap"
      />,
    );
    expect(getByTestId(SNAP_INSTALL_CONNECTION_REQUEST)).toBeDefined();
  });

  it('calls onConfirm when the connect button is pressed', () => {
    const { getByTestId } = render(
      <InstallSnapConnectionRequest
        approvalRequest={requestPermissionsData}
        onConfirm={onConfirm}
        onCancel={onCancel}
        snapName="@metamask/bip32-example-snap"
      />,
    );

    fireEvent.press(getByTestId(SNAP_INSTALL_CONNECT));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when the cancel button is pressed', () => {
    const { getByTestId } = render(
      <InstallSnapConnectionRequest
        approvalRequest={requestPermissionsData}
        onConfirm={onConfirm}
        onCancel={onCancel}
        snapName="@metamask/bip32-example-snap"
      />,
    );

    fireEvent.press(getByTestId(SNAP_INSTALL_CANCEL));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('correctly prefixes dappOrigin with protocol', () => {
    const { getByText } = render(
      <InstallSnapConnectionRequest
        approvalRequest={requestPermissionsData}
        onConfirm={onConfirm}
        onCancel={onCancel}
        snapName="@metamask/bip32-example-snap"
      />,
    );

    const expectedUrl = 'https://metamask.github.io';
    expect(getByText(expectedUrl)).toBeTruthy();
  });
});
///: END:ONLY_INCLUDE_IF
