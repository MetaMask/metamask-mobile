import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import InstallSnapConnectionRequest from '../InstallSnapConnectionRequest';
import {
  SNAP_INSTALL_CANCEL,
  SNAP_INSTALL_CONNECT,
  SNAP_INSTALL_CONNECTION_REQUEST,
} from '../../../../../../constants/test-ids';

describe('InstallSnapConnectionRequest', () => {
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

  it('renders correctly', () => {
    const { getByTestId } = render(
      <InstallSnapConnectionRequest
        requestData={requestData}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(getByTestId(SNAP_INSTALL_CONNECTION_REQUEST)).toBeDefined();
  });

  it('calls onConfirm when the connect button is pressed', () => {
    const { getByTestId } = render(
      <InstallSnapConnectionRequest
        requestData={requestData}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.press(getByTestId(SNAP_INSTALL_CONNECT));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when the cancel button is pressed', () => {
    const { getByTestId } = render(
      <InstallSnapConnectionRequest
        requestData={requestData}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.press(getByTestId(SNAP_INSTALL_CANCEL));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('correctly prefixes dappOrigin with protocol', () => {
    const { getByText } = render(
      <InstallSnapConnectionRequest
        requestData={requestData}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const expectedUrl = 'https://tss.ac';
    expect(getByText(expectedUrl)).toBeTruthy();
  });
});
