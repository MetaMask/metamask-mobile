import * as fs from 'fs';
import type { RootState } from '../../reducers';
import { selectTronSpecialAssetsBySelectedAccountGroup } from './assets-list';

const STATE_PATH =
  '/Users/ulisses/Downloads/state-logs-v8.20.0-(7798) (1).json';

describe('REPRO staked TRX', () => {
  it('computes special assets from the real 8.20 state log', () => {
    const raw = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    const state = raw as unknown as RootState;

    const result = selectTronSpecialAssetsBySelectedAccountGroup(state);

    // eslint-disable-next-line no-console
    console.log('REPRO_RESULT', JSON.stringify(result, null, 1));
    expect(result.status).toBeDefined();
  });
});
