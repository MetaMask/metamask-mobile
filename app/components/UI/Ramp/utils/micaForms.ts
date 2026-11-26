import Routes from '../../../../constants/navigation/Routes';

/**
 * Transak MiCA additional form types and the screen each one opens, in the
 * order they are routed when several are required at once.
 */
export const MICA_FORM_ROUTES = {
  CONSENT: Routes.RAMP.MICA_CONSENT,
  SOURCE_OF_INCOME: Routes.RAMP.SOURCE_OF_INCOME,
  ADDITIONAL_DETAILS_NATIONALITY: Routes.RAMP.ADDITIONAL_DETAILS_NATIONALITY,
} as const;

export type MicaFormType = keyof typeof MICA_FORM_ROUTES;

export const MICA_FORM_TYPES = Object.keys(MICA_FORM_ROUTES) as MicaFormType[];
