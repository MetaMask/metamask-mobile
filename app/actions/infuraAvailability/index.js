import {
  INFURA_AVAILABILITY_BLOCKED,
  INFURA_AVAILABILITY_NOT_BLOCKED,
} from '../../reducers/infuraAvailability';

export function setInfuraAvailabilityBlocked() {
  return {
    type: INFURA_AVAILABILITY_BLOCKED,
  };
}

export function setInfuraAvailabilityNotBlocked() {
  return {
    type: INFURA_AVAILABILITY_NOT_BLOCKED,
  };
}
