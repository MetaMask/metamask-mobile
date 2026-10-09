/** Profile attributes that currently have an edit screen. */
export const ManageProfileFieldName = {
  DisplayName: 'displayName',
  Bio: 'bio',
  TradingActivity: 'tradingActivity',
} as const;

export type ManageProfileFieldName =
  (typeof ManageProfileFieldName)[keyof typeof ManageProfileFieldName];

/** Params for the full-screen editor pushed from Manage profile. */
export interface ManageProfileFieldParams {
  field: ManageProfileFieldName;
  /** Value the form opens with. Empty string or false when unset. */
  initialValue: string | boolean;
}

/** One-shot result Manage profile reads after the editor commits a change. */
export interface ManageProfileFieldUpdate {
  field: ManageProfileFieldName;
  value: string | boolean;
}

export interface ManageProfileParams {
  fieldUpdate?: ManageProfileFieldUpdate;
}
