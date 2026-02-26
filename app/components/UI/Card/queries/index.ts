import { pinKeys, pinTokenMutationFn } from './pin';

export const cardQueries = {
  pin: {
    keys: pinKeys,
    tokenMutationFn: pinTokenMutationFn,
  },
};
