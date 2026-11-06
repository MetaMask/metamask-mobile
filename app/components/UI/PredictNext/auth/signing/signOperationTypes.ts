import type { TemplateInputs, TemplateValues } from './venueTemplates';

/** The `Venue-Authorization` header to attach to the predict-api call. */
export interface DeviceAuthHeader {
  name: string;
  value: string;
}

/** What a signed operation is rendered from. */
export interface SignOperationInput {
  /** What the user typed or confirmed, or what the phone generated. */
  inputs?: TemplateInputs;
  /** Named values predict-api returned. Each is shape-checked. */
  values?: TemplateValues;
  /** Defaults to `default`. Multi-step operations name their step. */
  step?: string;
  /**
   * The user confirmed this intent on screen. Required the first time a
   * `per-intent` operation is signed. A later signature of the same body
   * does not need it.
   */
  confirmed?: boolean;
}
