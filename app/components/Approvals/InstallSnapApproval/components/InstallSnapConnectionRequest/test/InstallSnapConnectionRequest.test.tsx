import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
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

  const mockStore = configureMockStore();
  const mockInitialState = {
    settings: {},
    engine: {
      backgroundState: {
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
        snapId="npm:@metamask/bip32-example-snap"
        snapName="@metamask/bip32-example-snap"
      />,
      { wrapper: Wrapper },
    );
    expect(getByTestId(SNAP_INSTALL_CONNECTION_REQUEST)).toBeDefined();
  });

  it('calls onConfirm when the connect button is pressed', () => {
    const { getByTestId } = render(
      <InstallSnapConnectionRequest
        approvalRequest={requestPermissionsData}
        onConfirm={onConfirm}
        onCancel={onCancel}
        snapId="npm:@metamask/bip32-example-snap"
        snapName="@metamask/bip32-example-snap"
      />,
      { wrapper: Wrapper },
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
        snapId="npm:@metamask/bip32-example-snap"
        snapName="@metamask/bip32-example-snap"
      />,
      { wrapper: Wrapper },
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
        snapId="npm:@metamask/bip32-example-snap"
        snapName="@metamask/bip32-example-snap"
      />,
      { wrapper: Wrapper },
    );

    const expectedUrl = 'https://metamask.github.io';
    expect(getByText(expectedUrl)).toBeTruthy();
  });
});
