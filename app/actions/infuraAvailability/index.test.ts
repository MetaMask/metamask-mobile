import {
  setInfuraAvailabilityBlocked,
  setInfuraAvailabilityNotBlocked,
} from './index';
import {
  INFURA_AVAILABILITY_BLOCKED,
  INFURA_AVAILABILITY_NOT_BLOCKED,
} from '../../reducers/infuraAvailability';

describe('setInfuraAvailabilityBlocked', () => {
  it('returns an action with type INFURA_AVAILABILITY_BLOCKED', () => {
    const action = setInfuraAvailabilityBlocked();
    expect(action.type).toEqual(INFURA_AVAILABILITY_BLOCKED);
  });
});

describe('setInfuraAvailabilityNotBlocked', () => {
  it('returns an action with type INFURA_AVAILABILITY_NOT_BLOCKED', () => {
    const action = setInfuraAvailabilityNotBlocked();
    expect(action.type).toEqual(INFURA_AVAILABILITY_NOT_BLOCKED);
  });
});
