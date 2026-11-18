import { useMemo } from 'react';
import { shallowEqual, useSelector } from 'react-redux';
import type { RootState } from '../../../../../../reducers';
import {
  selectPackPartnerAttentionOperations,
  selectPackPartnerOperation,
  selectPackPartnerSales,
} from '../selectors/packPartner';
import type { PackPartnerCard, PackPartnerPackOperation } from '../types';
import { withCardSales } from '../utils/operations';

/**
 * A pack operation of an account and, once opened, its awarded card: the
 * operation's result, with the account's sale of that card if any.
 */
export const usePackPartnerOperation = (
  address: string | undefined,
  memo: string,
): {
  operation: PackPartnerPackOperation | undefined;
  card: PackPartnerCard | undefined;
} => {
  const operation = useSelector((state: RootState) =>
    selectPackPartnerOperation(state, address, memo),
  );
  const sales = useSelector((state: RootState) =>
    selectPackPartnerSales(state, address),
  );
  const result = operation?.result;
  const card = useMemo(
    () => (result ? withCardSales([result], sales)[0] : undefined),
    [result, sales],
  );
  return { operation, card };
};

/** Operations the user must see (processing, card to reveal, expired, failed), newest first. */
export const useAttentionOperations = (
  address: string | undefined,
): PackPartnerPackOperation[] =>
  useSelector(
    (state: RootState) => selectPackPartnerAttentionOperations(state, address),
    shallowEqual,
  );
