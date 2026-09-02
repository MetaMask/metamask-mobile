import type { MessengerClientInitFunction } from '../types';
import {
  RewardsMoneyDataService,
  type RewardsMoneyDataServiceMessenger,
} from './rewards-money-controller/services';
import { getReferralProgramApiBaseUrl } from './rewards-money-controller/utils/referral-program-api-url';
import I18n from '../../../../locales/i18n';

/**
 * Initialize the rewards money data service.
 *
 * The referral-program API takes a Hydra `Authorization: Bearer` token whose
 * `sub` is the profile id, sourced from the AuthenticationController — not the
 * rewards subscription-token vault. `getBearerToken` is injected rather than
 * called inside the service so tests can supply a plain `jest.fn()`.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const rewardsMoneyDataServiceInit: MessengerClientInitFunction<
  RewardsMoneyDataService,
  RewardsMoneyDataServiceMessenger
> = ({ controllerMessenger }) => {
  const getBearerToken = async (): Promise<string | undefined> => {
    try {
      return await Promise.resolve(
        controllerMessenger.call('AuthenticationController:getBearerToken'),
      );
    } catch {
      // Signed out, or the wallet is locked. The data service turns a missing
      // token into a ReferralProgramAuthorizationError so the UI can prompt a
      // sign-in rather than showing a transport failure.
      return undefined;
    }
  };

  const controller = new RewardsMoneyDataService({
    messenger: controllerMessenger,
    fetch,
    baseUrl: getReferralProgramApiBaseUrl(),
    getBearerToken,
    locale: I18n.locale,
  });

  return { controller };
};
