import type { UiSlotDataReference, UiSlotWidget } from '../types';

export interface UiSlotsContractRegistry {
  slots: Record<
    string,
    {
      widgetTypes: readonly UiSlotWidget['type'][];
      dataReferenceTypes: readonly UiSlotDataReference['type'][];
      requiredDataReferenceTypes?: readonly UiSlotDataReference['type'][];
    }
  >;
  widgets: Record<string, (value: unknown) => UiSlotWidget>;
  dataReferences: Record<string, (value: unknown) => UiSlotDataReference>;
}
