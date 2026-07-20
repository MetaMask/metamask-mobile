import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ConfirmationParams } from '../../../Views/confirmations/components/confirm/confirm-component';
import type { EarnMusdConversionEducationViewRouteParams } from '../Views/EarnMusdConversionEducationView';
import type {
  LendingDepositConfirmationParams,
  LendingMaxWithdrawalModalParams,
  LendingWithdrawalConfirmationParams,
} from '../Earn.types';

/**
 * Param list for screens inside the Earn screen stack (`EarnScreenStack`).
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type EarnScreensStackParamList = {
  EarnLendingDepositConfirmation: LendingDepositConfirmationParams | undefined;
  EarnLendingWithdrawalConfirmation:
    | LendingWithdrawalConfirmationParams
    | undefined;
  EarnMusdConversionEducation:
    | EarnMusdConversionEducationViewRouteParams
    | undefined;
  RedesignedConfirmations: ConfirmationParams | undefined;
};

/**
 * Param list for screens inside the Earn modal stack (`EarnModalStack`).
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type EarnModalsNavigationParamList = {
  EarnLendingMaxWithdrawalModal: LendingMaxWithdrawalModalParams | undefined;
  EarnLendingLearnMoreModal: undefined;
  RedesignedConfirmations: ConfirmationParams | undefined;
};

/**
 * Feature-level Earn navigation params for nested `EarnScreens` / `EarnModals` entry.
 */
// Intersection (`&`) requires `type`; `interface` cannot express this.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type EarnNavigationParamList = EarnScreensStackParamList &
  EarnModalsNavigationParamList & {
    EarnScreens: NavigatorScreenParams<EarnScreensStackParamList> | undefined;
    EarnModals:
      | NavigatorScreenParams<EarnModalsNavigationParamList>
      | undefined;
  };
