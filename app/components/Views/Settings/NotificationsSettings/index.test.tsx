import React from 'react';

import renderWithProvider from '../../../../util/test/renderWithProvider';

import { backgroundState } from '../../../../util/test/initial-root-state';
import NotificationsSettings from '.';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';

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
    const { toJSON } = renderWithProvider(
      <NotificationsSettings
        navigation={{
          setOptions,
        }}
        route={{}}
      />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
