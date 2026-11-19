import type { ChoosePasswordRouteParams } from './ChoosePassword.types';

export type ChoosePasswordFlow =
  | 'recovery_reset'
  | 'social_create'
  | 'srp_create';

/**
 * Picks the Create password flow for the route params.
 *
 * @param params - The ChoosePassword route params.
 * @returns The flow to render.
 */
export const getChoosePasswordFlow = (
  params: ChoosePasswordRouteParams | undefined,
): ChoosePasswordFlow => {
  if (params?.passwordlessSocialRecovery === true) {
    return 'recovery_reset';
  }
  if (params?.oauthLoginSuccess) {
    return 'social_create';
  }
  return 'srp_create';
};
