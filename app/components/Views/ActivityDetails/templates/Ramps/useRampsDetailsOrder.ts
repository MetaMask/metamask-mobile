import { useMemo } from 'react';
/* eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): reuses the activity list ramp lookup */
import { useFindRampOrder } from '../../../ActivityList/hooks/useFindRampOrder';

export function useRampsDetailsOrder(txIdentifier: string | undefined) {
  const findRampOrder = useFindRampOrder();

  return useMemo(
    () => findRampOrder(txIdentifier),
    [findRampOrder, txIdentifier],
  );
}
