import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../../../core/Engine';
import type { CollectorCryptPack } from '../types';

export const collectorCryptPacksKey = ['collectorCrypt', 'packs'] as const;

/** Open public packs, cached for a minute. */
export const collectorCryptPacksOptions = () =>
  queryOptions<CollectorCryptPack[], Error>({
    queryKey: collectorCryptPacksKey,
    queryFn: (): Promise<CollectorCryptPack[]> =>
      Engine.context.GachaController.getPacks(),
    staleTime: 60_000,
  });
