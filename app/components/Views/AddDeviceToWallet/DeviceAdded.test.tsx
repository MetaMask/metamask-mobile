import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { strings } from '../../../../locales/i18n';
import { defaultQrSyncControllerState } from '../../../core/QrSync/QrSyncController';
import DeviceAdded from './DeviceAdded';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

const renderComponent = () =>
  renderWithProvider(<DeviceAdded />, {
    state: {
      engine: {
        backgroundState: {
          QrSyncController: {
            ...defaultQrSyncControllerState,
          },
        },
      },
    },
  });

describe('DeviceAdded', () => {
  it('renders the waiting for extension screen', () => {
    const { getByText, getByTestId, queryByTestId } = renderComponent();

    expect(getByTestId('device-added-loader')).toBeOnTheScreen();
    expect(
      getByText(strings('app_settings.add_device.waiting_for_extension')),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('app_settings.add_device.waiting_for_extension_description'),
      ),
    ).toBeOnTheScreen();
    expect(queryByTestId('device-added-back-button')).toBeNull();
  });
});
