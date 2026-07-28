/**
 * Skill-facing alias for the shared MM Pay visual validation store.
 * Canonical implementation: confirmations/debug/mmPayVisualValidation.
 */
export {
  getOverridesForState,
  getMMPayVisualStateId,
  setMMPayVisualStateId,
  subscribeMMPayVisualState,
  useMMPayVisualOverrides,
  getMMPayVisualPresetGroups,
  getMMPayPageTitle,
  MM_PAY_VISUAL_PRESETS,
  type MMPayVisualStateId,
  type MMPayVisualOverrides,
  type MMPayVisualPreset,
  type MMPayVisualPage,
} from '../../../Views/confirmations/debug/mmPayVisualValidation';
