import { shallowEqual, useSelector } from 'react-redux';
import type { RootState } from '../../../../../../reducers';
import {
  selectCollectorCryptAttentionOperations,
  selectCollectorCryptCard,
  selectCollectorCryptOperation,
} from '../selectors/collectorCrypt';
import type { CollectorCryptCard, PackOperation } from '../types';

/** A pack operation of an account and, once opened, its card. */
export const useCollectorCryptOperation = (
  address: string | undefined,
  memo: string,
): {
  operation: PackOperation | undefined;
  card: CollectorCryptCard | undefined;
} => {
  const operation = useSelector((state: RootState) =>
    selectCollectorCryptOperation(state, address, memo),
  );
  const mint = operation?.mint;
  const card = useSelector((state: RootState) =>
    mint ? selectCollectorCryptCard(state, address, mint) : undefined,
  );
  return { operation, card };
};

/** Operations the user must see (processing, card to reveal, expired, failed), newest first. */
export const useAttentionOperations = (
  address: string | undefined,
): PackOperation[] =>
  useSelector(
    (state: RootState) =>
      selectCollectorCryptAttentionOperations(state, address),
    shallowEqual,
  );
