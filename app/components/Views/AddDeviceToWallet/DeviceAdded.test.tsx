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

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');

  return {
    ...actual,
    AvatarAccount: () => null,
  };
});

const renderComponent = (onCancel = jest.fn()) =>
  renderWithProvider(<DeviceAdded onCancel={onCancel} />, {
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
    const { getByText, getByTestId, queryByText } = renderComponent();

    expect(getByTestId('extension-handoff-animation')).toBeOnTheScreen();
    expect(getByTestId('extension-handoff-fox')).toBeOnTheScreen();
    expect(
      getByText(strings('app_settings.add_device.waiting_for_extension')),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('app_settings.add_device.waiting_for_extension_description'),
      ),
    ).toBeOnTheScreen();
    expect(queryByText(/step 3 of 3/iu)).not.toBeOnTheScreen();
    expect(getByTestId('button-icon')).toBeOnTheScreen();
  });
});
