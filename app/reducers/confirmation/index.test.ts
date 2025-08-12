import confirmationReducer, { ConfirmationState } from '.';

const initialState: ConfirmationState = {
  upgradeSplashPageAcknowledgedForAccounts: [],
};

const mockAccount = '0x123';
const mockState = {
  upgradeSplashPageAcknowledgedForAccounts: [mockAccount],
};

describe('confirmation', () => {
  it('should return the initial state', () => {
    expect(confirmationReducer(undefined, { type: '' })).toEqual(initialState);
  });

  it('updates state when action.type is UPGRADE_SPLASH_PAGE_ACKNOWLEDGED_FOR_ACCOUNT', () => {
    expect(
      confirmationReducer(initialState, {
        type: 'UPGRADE_SPLASH_PAGE_ACKNOWLEDGED_FOR_ACCOUNT',
        account: mockAccount,
      }),
    ).toStrictEqual(mockState);
  });

  it('does not add account to upgradeSplashPageAcknowledgedForAccounts is already added', () => {
    expect(
      confirmationReducer(mockState, {
        type: 'UPGRADE_SPLASH_PAGE_ACKNOWLEDGED_FOR_ACCOUNT',
        account: mockAccount,
      }),
    ).toStrictEqual(mockState);
  });
});
