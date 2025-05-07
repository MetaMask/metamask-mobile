import { RootState } from '../reducers';
import { selectMultichainBalances } from './multichainBalancesController';

describe('selectMultichainBalances', () => {
  it('should return the multichain balances', () => {
    const balances = {
        'c10c3c88-b2c3-4d54-840d-9a953dd0e47a': {
            solana: {
                amount: '50',
                unit: 'SOL',
            },
        },
    };
    const state = {
        engine: {
            backgroundState: {
                MultichainBalancesController: {
                    balances,
                },
            },
        },
    };

    const result = selectMultichainBalances(state as unknown as RootState);
    expect(result).toEqual(balances);
  });
});
