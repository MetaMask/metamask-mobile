import { strings } from '../../../../../locales/i18n';
import { AllowanceState } from '../types';

export const mapAllowanceStateToLabel = (state: AllowanceState): string => {
  switch (state) {
    case AllowanceState.NotEnabled:
      return strings('card.allowance_states.not_enabled');
    case AllowanceState.Enabled:
      return strings('card.allowance_states.enabled');
    case AllowanceState.Limited:
      return strings('card.allowance_states.limited');
  }
};
