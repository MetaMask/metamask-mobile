import React from 'react';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import ClaimBanner from './ClaimBanner';
import { fireEvent } from '@testing-library/react-native';
import { createMockAccountsControllerState } from '../../../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';
import { MOCK_POOL_STAKING_SDK } from '../../../../__mocks__/mockData';

const MOCK_CLAIM_AMOUNT = '0.016';
const MOCK_ADDRESS_1 = '0x0123456789abcdef0123456789abcdef01234567';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
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

jest.mock('../../../../hooks/useStakeContext', () => ({
  __esModule: true,
  useStakeContext: jest.fn(() => MOCK_POOL_STAKING_SDK),
}));

const mockAttemptPoolStakedClaimTransaction = jest.fn();

jest.mock('../../../../hooks/usePoolStakedClaim', () => ({
  __esModule: true,
  default: () => ({
    attemptPoolStakedClaimTransaction: mockAttemptPoolStakedClaimTransaction,
  }),
}));

describe('ClaimBanner', () => {
  it('render matches snapshot', () => {
    const { toJSON } = renderWithProvider(
      <ClaimBanner claimableAmount={MOCK_CLAIM_AMOUNT} />,
      { state: mockInitialState },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('claim button is disabled on subsequent presses', async () => {
    const { getByTestId } = renderWithProvider(
      <ClaimBanner claimableAmount={MOCK_CLAIM_AMOUNT} />,
      { state: mockInitialState },
    );

    const claimButton = getByTestId('claim-banner-claim-eth-button');

    fireEvent.press(claimButton);

    expect(claimButton.props.disabled).toBe(true);
    expect(mockAttemptPoolStakedClaimTransaction).toHaveBeenCalledTimes(1);
  });
});
