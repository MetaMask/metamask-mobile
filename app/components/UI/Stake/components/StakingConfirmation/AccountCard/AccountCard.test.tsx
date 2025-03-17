import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import AccountCard from './AccountCard';
import { strings } from '../../../../../../../locales/i18n';
import { createMockAccountsControllerState } from '../../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { AccountCardProps } from './AccountCard.types';
import { MOCK_VAULT_DATA } from '../../../__mocks__/earnControllerMockData';

const MOCK_STAKING_CONTRACT_NAME = 'MM Pooled Staking';

const MOCK_ADDRESS_1 = '0x0';
const MOCK_ADDRESS_2 = '0x1';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
  MOCK_ADDRESS_2,
]);

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

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

jest.mock('../../../hooks/useVaultMetadata', () => ({
  __esModule: true,
  default: () => ({
    vaultMetadata: MOCK_VAULT_DATA,
    isLoadingVaultMetadata: false,
    error: null,
    annualRewardRate: '2.5%',
    annualRewardRateDecimal: 0.025,
  }),
}));

describe('AccountCard', () => {
  it('render matches snapshot', () => {
    const props: AccountCardProps = {
      contractName: MOCK_STAKING_CONTRACT_NAME,
      primaryLabel: strings('stake.staking_from'),
      secondaryLabel: strings('stake.interacting_with'),
    };

    const { getByText, toJSON } = renderWithProvider(
      <AccountCard {...props} />,
      { state: mockInitialState },
    );

    expect(getByText(strings('stake.staking_from'))).toBeDefined();
    expect(getByText(strings('stake.interacting_with'))).toBeDefined();
    expect(getByText(strings('asset_details.network'))).toBeDefined();
    expect(getByText(props.contractName)).toBeDefined();

    expect(toJSON()).toMatchSnapshot();
  });
});
