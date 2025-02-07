import React from 'react';
import SwitchCustomNetwork from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

const mockInitialState = {
  wizard: {
    step: 1,
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

describe('SwitchCustomNetwork', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <SwitchCustomNetwork
        customNetworkInformation={{ chainName: '', chainId: '' }}
        currentPageInformation={{ url: 'https://app.uniswap.org/' }}
      />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
