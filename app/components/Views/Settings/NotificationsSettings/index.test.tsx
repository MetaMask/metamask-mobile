import React from 'react';

import renderWithProvider from '../../../../util/test/renderWithProvider';

import { backgroundState } from '../../../../util/test/initial-root-state';
import NotificationsSettings from '.';
import { Props } from './NotificationsSettings.types';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';

// Mock store.getState
let mockGetState: jest.Mock;
jest.mock('../../../../store', () => {
  mockGetState = jest.fn();
  mockGetState.mockImplementation(() => ({
    notifications: {},
  }));

  return {
    store: {
      getState: mockGetState,
      dispatch: jest.fn(),
    },
  };
});

const mockInitialState = {
  settings: {
    useBlockieIcon: false,
  },
  notificationsSettings: {
    isEnabled: true,
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

const setOptions = jest.fn();

describe('NotificationsSettings', () => {
  it('should render correctly', () => {
    mockGetState.mockImplementation(() => ({
      notifications: {},
    }));
    const { toJSON } = renderWithProvider(
      <NotificationsSettings
        navigation={
          {
            setOptions,
          } as unknown as Props['navigation']
        }
        route={{} as unknown as Props['route']}
      />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
