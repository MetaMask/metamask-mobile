import { ActionType, setAmount, setCurrency } from ".";

describe('stakeActions', () => {
    describe('setAmount', () => {
        const actionAmount = '1000'

        it('should create an action to set the amount', () => {
            expect(setAmount(actionAmount)).toEqual({
                type: ActionType.SET_STAKE_AMOUNT,
                amount: actionAmount,
            });
        });
    });

    describe('setCurrency', () => {
        const actionCurrency = 'ETH'

        it('should create an action to set the amount', () => {
            expect(setCurrency(actionCurrency)).toEqual({
                type: ActionType.SET_STAKE_AMOUNT,
                currency: actionCurrency,
            });
        });
    });
});
