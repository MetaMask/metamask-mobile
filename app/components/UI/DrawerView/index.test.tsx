import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import DrawerView from './';

import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('../../../core/Engine', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const { MOCK_ACCOUNTS_CONTROLLER_STATE } = jest.requireActual(
    '../../../util/test/accountsControllerTestUtils',
  );
  return {
    getTotalFiatAccountBalance: () => ({ ethFiat: 0, tokenFiat: 0 }),
    context: {
      KeyringController: {
        state: {
          keyrings: [],
        },
      },
      AccountsController: {
        ...MOCK_ACCOUNTS_CONTROLLER_STATE,
        state: MOCK_ACCOUNTS_CONTROLLER_STATE,
      },
    },
  };
});

describe('DrawerView', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <DrawerView navigation={{ goBack: () => null }} />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
