import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import InstallSnapSuccess from '../InstallSnapSuccess';
import {
  SNAP_INSTALL_OK,
  SNAP_INSTALL_SUCCESS,
} from '../../../../../../constants/test-ids';

describe('InstallSnapSuccess', () => {
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByTestId } = render(
      <InstallSnapSuccess
        requestData={requestData}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(getByTestId(SNAP_INSTALL_SUCCESS)).toBeDefined();
  });

  it('calls onConfirm when the OK button is pressed', () => {
    const { getByTestId } = render(
      <InstallSnapSuccess
        requestData={requestData}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.press(getByTestId(SNAP_INSTALL_OK));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('displays the correct snap name', () => {
    const { getByText } = render(
      <InstallSnapSuccess
        requestData={requestData}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const expectedSnapName = '@lavamoat/tss-snap';
    expect(getByText(expectedSnapName)).toBeTruthy();
  });
});
