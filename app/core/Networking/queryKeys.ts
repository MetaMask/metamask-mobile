import type { Json } from '@metamask/utils';

/** Creates keys in the feature's namespace; never put secrets in a key. */
export function createQueryKeys<const Feature extends string>(
  feature: Feature,
) {
  return {
    of: <const Entity extends string, const Params extends readonly Json[]>(
      entity: Entity,
      ...params: Params
    ) => [feature, entity, ...params] as const,
  };
}
