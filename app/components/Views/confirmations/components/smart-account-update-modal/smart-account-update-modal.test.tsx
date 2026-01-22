import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import Engine from '../../../../../core/Engine';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  getAppStateForConfirmation,
  upgradeAccountConfirmation,
} from '../../../../../util/test/confirm-data-helpers';
// eslint-disable-next-line import/no-namespace
import * as AddressUtils from '../../../../../util/address';
import { SmartAccountUpdateModal } from './smart-account-update-modal';

jest.mock('react-native-safe-area-context', () => {
  // using disting digits for mock rects to make sure they are not mixed up
  const inset = { top: 1, right: 2, bottom: 3, left: 4 };
  const frame = { width: 5, height: 6, x: 7, y: 8 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

jest.mock('../../../../hooks/AssetPolling/AssetPollingProvider', () => ({
  AssetPollingProvider: () => null,
}));

jest.mock('../../../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: () => ({ tokenFiat: 10 }),
  context: {
    PreferencesController: {
      setSmartAccountOptIn: jest.fn(),
    },
  },
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

const renderComponent = (state?: Record<string, unknown>) =>
  renderWithProvider(<SmartAccountUpdateModal />, {
    state:
      state ??
      getAppStateForConfirmation(upgradeAccountConfirmation, {
        PreferencesController: { smartAccountOptIn: false },
      }),
  });

describe('SmartAccountUpdateModal', () => {
  beforeEach(() => {
    jest.spyOn(AddressUtils, 'isHardwareAccount').mockReturnValue(false);
  });

  it('renders correctly', () => {
    const { getByText } = renderComponent();
    expect(getByText('Use smart account?')).toBeTruthy();
  });

  it('show success after `Yes` button is clicked', () => {
    const { getByText, queryByText } = renderComponent();
    expect(getByText('Use smart account?')).toBeTruthy();
    fireEvent.press(getByText('Use smart account'));
    expect(
      Engine.context.PreferencesController.setSmartAccountOptIn,
    ).toHaveBeenCalled();
    expect(queryByText('Use smart account?')).toBeNull();
    expect(getByText('Success')).toBeTruthy();
  });
});
