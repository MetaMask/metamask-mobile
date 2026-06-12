import { clearAcquisitionStateAfterOptIn } from './clearAcquisitionStateAfterOptIn';
import { clearAttribution } from '../../core/redux/slices/attribution';

describe('clearAcquisitionStateAfterOptIn', () => {
  it('dispatches clearAttribution', () => {
    const dispatch = jest.fn();

    clearAcquisitionStateAfterOptIn(dispatch);

    expect(dispatch).toHaveBeenCalledWith(clearAttribution());
  });
});
