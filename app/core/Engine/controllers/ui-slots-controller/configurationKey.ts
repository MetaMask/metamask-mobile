import type {
  UiSlotsConfigurationKey,
  UiSlotsPlatform,
  UiSlotsScreenId,
} from './types';

export function buildUiSlotsConfigurationKey({
  screenId,
  locale,
  platform,
  contractMajor,
  capabilityCohort,
}: {
  screenId: UiSlotsScreenId;
  locale: string;
  platform: UiSlotsPlatform;
  contractMajor: number;
  capabilityCohort: string;
}): UiSlotsConfigurationKey {
  return [
    screenId,
    encodeURIComponent(locale),
    platform,
    contractMajor,
    capabilityCohort,
  ].join(':');
}
