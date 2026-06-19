import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import DeviceAdded from './DeviceAdded';
import { strings } from '../../../../locales/i18n';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      goBack: jest.fn(),
    }),
  };
});

describe('DeviceAdded', () => {
  it('renders device added confirmation title', () => {
    const { getByText } = renderWithProvider(<DeviceAdded />);

    expect(
      getByText(strings('app_settings.add_device.device_added')),
    ).toBeOnTheScreen();
  });
});
