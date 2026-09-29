import { cloneDeep } from 'lodash';
import { initialState as mockRootState } from '../../components/UI/Bridge/_mocks_/initialState';
import type { RootState } from '../../reducers';
import { selectControllerFields } from '../../core/redux/slices/bridge';
import { selectMinSolBalance } from '.';

describe('bridgeController selectors', () => {
  describe('selectMinSolBalance', () => {
    beforeEach(() => {
      selectControllerFields.resetRecomputations();
      selectMinSolBalance.resetRecomputations();
    });

    it('does not recompute when unrelated bridge UI state changes', () => {
      const mockState = cloneDeep(mockRootState) as unknown as RootState;

      selectMinSolBalance(mockState);

      const controllerFieldsRecomputations =
        selectControllerFields.recomputations();
      const minSolBalanceRecomputations = selectMinSolBalance.recomputations();

      const unrelatedState = {
        ...mockState,
        bridge: {
          ...mockState.bridge,
          sourceAmount: '1',
        },
      } as RootState;

      selectMinSolBalance(unrelatedState);

      expect(selectControllerFields.recomputations()).toBe(
        controllerFieldsRecomputations,
      );
      expect(selectMinSolBalance.recomputations()).toBe(
        minSolBalanceRecomputations,
      );
    });
  });
});
