import type { NavigatorScreenParams } from '@react-navigation/native';
import type { Nft } from '@metamask/assets-controllers';
import type { ConfirmationParams } from '../../confirm/confirm-component';
import type { AssetType } from '../../../types/token';
import type {
  PredefinedRecipient,
  SendNavigationParams,
} from '../../../utils/send';

/**
 * Params shared by screens inside the redesigned Send stack.
 *
 * Includes modern send-flow fields (`asset` / `location` / `predefinedRecipient`)
 * and legacy deeplink `txMeta` still passed into nested screens.
 */
export type SendScreenRouteParams =
  | {
      asset?: AssetType | Nft;
      location?: string;
      predefinedRecipient?: PredefinedRecipient;
      txMeta?: Record<string, unknown>;
    }
  | undefined;

/**
 * Param list for screens inside the Send stack (`Send`).
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SendStackParamList = {
  Amount: SendScreenRouteParams;
  Asset: SendScreenRouteParams;
  Recipient: SendScreenRouteParams;
  RedesignedConfirmations: ConfirmationParams | undefined;
};

/**
 * Feature-level Send navigation params for nested `Send` entry.
 *
 * `SendNavigationParams` is the shape used by `handleSendPageNavigation` when
 * choosing the initial nested screen; callers still navigate via
 * `{ screen, params }`.
 */
// Intersection (`&`) requires `type`; `interface` cannot express this.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SendNavigationParamList = SendStackParamList & {
  Send: NavigatorScreenParams<SendStackParamList> | undefined;
};

export type { SendNavigationParams, PredefinedRecipient };
