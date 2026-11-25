import {
  type FetchQueryOptions,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { getNetworkConditions } from '../../util/deviceCapability/conditions';
import { isTierPolicyEnabled } from './killSwitch';
import { allowsPrefetch } from './policies';

/** Prefetches only when the current conditions permit speculative work. */
export async function prefetchIfAllowed<Data, ErrorType, Key extends QueryKey>(
  client: QueryClient,
  options: FetchQueryOptions<Data, ErrorType, Data, Key>,
): Promise<void> {
  if (allowsPrefetch(getNetworkConditions(), isTierPolicyEnabled())) {
    await client.prefetchQuery(options);
  }
}
