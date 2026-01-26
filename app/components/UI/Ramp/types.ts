/**
 * Param list for the Ramp token list main stack navigator.
 */
export interface RampMainParamList {
  RampTokenSelection: undefined;
}

/**
 * Param list for the Ramp token list modals stack navigator.
 */
export interface RampModalsParamList {
  RampUnsupportedTokenModal: undefined;
}

/**
 * Param list for the Ramp token list root navigator (combines main and modals).
 */
export type RampTokenListParamList = RampMainParamList & {
  RampModals: undefined;
};

/**
 * Combined param list for all Ramp-related navigation.
 */
export type RampParamList = RampTokenListParamList & RampModalsParamList;
