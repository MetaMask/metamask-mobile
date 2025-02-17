import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { stakingDepositConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import StakingDeposit from './StakingDeposit';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      setOptions: jest.fn(),
    }),
  };
});

describe('StakingDeposit', () => {
  it('should render correctly', () => {
    const { getByText } = renderWithProvider(<StakingDeposit />, {
      state: stakingDepositConfirmationState,
    });
    expect(getByText('0.0001 ETH')).toBeDefined();
  });
});
