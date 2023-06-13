import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import InstallSnapError from '../InstallSnapError';
import {
  SNAP_INSTALL_ERROR,
  SNAP_INSTALL_OK,
} from '../../../../../../constants/test-ids';

describe('InstallSnapError', () => {
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
                snaps: true,
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
  const onCancel = jest.fn();
  const error = new Error('Installation failed');

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByTestId } = render(
      <InstallSnapError
        requestData={requestData}
        onConfirm={onConfirm}
        error={error}
        onCancel={onCancel}
      />,
    );

    expect(getByTestId(SNAP_INSTALL_ERROR)).toBeTruthy();
  });

  it('calls onConfirm when the OK button is pressed', () => {
    const { getByTestId } = render(
      <InstallSnapError
        requestData={requestData}
        onConfirm={onConfirm}
        error={error}
        onCancel={onCancel}
      />,
    );

    fireEvent.press(getByTestId(SNAP_INSTALL_OK));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('displays the correct snap name', () => {
    const { getByText } = render(
      <InstallSnapError
        requestData={requestData}
        onConfirm={onConfirm}
        error={error}
        onCancel={onCancel}
      />,
    );

    const expectedSnapName = '@lavamoat/tss-snap';
    expect(getByText(expectedSnapName)).toBeTruthy();
  });

  it('displays the correct error title', () => {
    const { getByText } = render(
      <InstallSnapError
        requestData={requestData}
        onConfirm={onConfirm}
        error={error}
        onCancel={onCancel}
      />,
    );

    expect(getByText('Installation failed')).toBeTruthy();
  });
});
