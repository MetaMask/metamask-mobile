import { createMethodMiddleware } from '@metamask/json-rpc-engine';
import { methodHandlers as multichainMethodHandlers } from '@metamask/multichain-api-middleware';

type UnionToIntersection<Union> = (
  Union extends unknown ? (k: Union) => void : never
) extends (k: infer Intersection) => void
  ? Intersection
  : never;

type MultichainHandlerHooks = UnionToIntersection<
  Parameters<
    (typeof multichainMethodHandlers)[keyof typeof multichainMethodHandlers]['implementation']
  >[4]
>;

export const createMultichainMethodMiddleware = (
  hooks: MultichainHandlerHooks,
) =>
  createMethodMiddleware({
    handlers: {
      ...multichainMethodHandlers,
    },
    hooks,
  });
