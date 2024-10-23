import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import AccountCard from './AccountCard';
import { strings } from '../../../../../../../locales/i18n';
import { createMockAccountsControllerState } from '../../../../../../util/test/accountsControllerTestUtils';
import configureMockStore from 'redux-mock-store';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { Provider } from 'react-redux';
import { AccountCardProps } from './AccountCard.types';

const MOCK_STAKING_CONTRACT_NAME = 'MM Pooled Staking';

const MOCK_ADDRESS_1 = '0x0';
const MOCK_ADDRESS_2 = '0x1';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
  MOCK_ADDRESS_2,
]);

const mockStore = configureMockStore();

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};
const store = mockStore(mockInitialState);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(mockInitialState)),
}));

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

describe('AccountCard', () => {
  it('render matches snapshot', () => {
    const props: AccountCardProps = {
      contractName: MOCK_STAKING_CONTRACT_NAME,
      primaryLabel: strings('stake.staking_from'),
      secondaryLabel: strings('stake.interacting_with'),
    };

    const { getByText, toJSON } = renderWithProvider(
      <Provider store={store}>
        <AccountCard {...props} />,
      </Provider>,
    );

    expect(getByText(strings('stake.staking_from'))).toBeDefined();
    expect(getByText(strings('stake.interacting_with'))).toBeDefined();
    expect(getByText(strings('asset_details.network'))).toBeDefined();
    expect(getByText(props.contractName)).toBeDefined();

    expect(toJSON()).toMatchSnapshot();
  });
});
