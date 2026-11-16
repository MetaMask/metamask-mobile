import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

import { Authentication } from '../../../../core';
import { useOTAUpdates } from '../../../hooks/useOTAUpdates';
import { selectSeedlessOnboardingLoginFlow } from '../../../../selectors/seedlessOnboardingController';
import initialRootState from '../../../../util/test/initial-root-state';
import AppShellEffects from './AppShellEffects';

/**
 * AppShellEffects renders nothing. The contract is that the OTA hook and the
 * seedless password check run on mount. A component-view test drives visible
 * UI and does not observe these calls.
 */

jest.mock('../../../hooks/useOTAUpdates', () => ({
  useOTAUpdates: jest.fn(),
}));

jest.mock('../../../../core', () => ({
  Authentication: {
    checkIsSeedlessPasswordOutdated: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../../../../selectors/seedlessOnboardingController', () => ({
  selectSeedlessOnboardingLoginFlow: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '1.0.0'),
}));

jest.mock('../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue('1.0.0'),
    setItem: jest.fn().mockResolvedValue(undefined),
  },
}));

const renderEffects = () => {
  const store = configureMockStore()(initialRootState);

  return render(
    <Provider store={store}>
      <AppShellEffects />
    </Provider>,
  );
};

describe('AppShellEffects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(Authentication.checkIsSeedlessPasswordOutdated)
      .mockResolvedValue(false);
    jest.mocked(selectSeedlessOnboardingLoginFlow).mockReturnValue(true);
  });

  it('runs the OTA hook and the seedless password check on mount', async () => {
    renderEffects();

    expect(useOTAUpdates).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(
        Authentication.checkIsSeedlessPasswordOutdated,
      ).toHaveBeenCalledWith({
        skipCache: true,
        captureSentryError: false,
      });
    });
  });
});
