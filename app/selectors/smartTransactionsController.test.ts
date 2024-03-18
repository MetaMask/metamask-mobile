import { getSmartTransactionsEnabled } from './smartTransactionsController';
import initialBackgroundState from '../util/test/initial-background-state.json';

const initialState: any = {
  engine: {
    backgroundState: initialBackgroundState,
  },
  swaps: {
    '0x1': {
      isLive: false,
      smartTransactions: {},
    },
  },
};
initialState.engine.backgroundState.PreferencesController.selectedAddress =
  '0xabc';

describe('SmartTransactionsController Selectors', () => {
  describe('getSmartTransactionsEnabled', () => {
    // it('should return true if smart transactions are enabled', () => {});
    it('should return false if smart transactions are not enabled', () => {
      const enabled = getSmartTransactionsEnabled(initialState);
      expect(enabled).toEqual(false);
    });
  });
  // describe('getIsSmartTransaction', () => {
  //   it('should return true if smart transactions are enabled', () => {});
  //   it('should return false if smart transactions are not enabled', () => {});
  // });
});
