import {
  INotification,
  TRIGGER_TYPES,
} from '@metamask/notification-services-controller/notification-services';

/**
 * TODO - remove this once we upgrade TS.
 * There is a typescript compiler bug where Extract does not fully compute unions, which is fixed in a later version
 * GH Issue: https://github.com/MetaMask/metamask-mobile/issues/10364
 * */
type CustomExtract<T, U> = T extends T
  ? U extends Partial<T>
    ? T
    : never
  : never;

export type ExtractedNotification<NodeType extends TRIGGER_TYPES> =
  NodeType extends NodeType
    ? CustomExtract<INotification, { type: NodeType }>
    : never;

export const isOfTypeNodeGuard =
  <NodeType extends INotification['type']>(types: NodeType[]) =>
  (n: INotification): n is ExtractedNotification<NodeType> =>
    n?.type && types.includes(n.type as NodeType);
