import { SnapId } from '@metamask/snaps-sdk';
import { SnapRpcHookArgs } from '@metamask/snaps-utils';

export type HandleSnapRequestArgs = SnapRpcHookArgs & { snapId: SnapId };
