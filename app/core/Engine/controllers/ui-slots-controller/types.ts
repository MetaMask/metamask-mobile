import type {
  ControllerGetStateAction,
  ControllerStateChangeEvent,
} from '@metamask/base-controller';
import type { Messenger } from '@metamask/messenger';
import type {
  RemoteFeatureFlagControllerGetStateAction,
  RemoteFeatureFlagControllerStateChangeEvent,
} from '@metamask/remote-feature-flag-controller';
import type { UiSlotsDataServiceActions } from './UiSlotsDataService';

export const UI_SLOTS_CONTROLLER_NAME = 'UiSlotsController' as const;

export interface UiSlotsScreenIdMap {}

export type UiSlotsScreenId = keyof UiSlotsScreenIdMap & string;
export type UiSlotsConfigurationKey = string;
export type UiSlotsPlatform = 'extension' | 'mobile';

export interface UiSlotWidgetMap {}

export type UiSlotWidget = UiSlotWidgetMap[keyof UiSlotWidgetMap];

export interface UiSlotActionMap {}

export type UiSlotAction = UiSlotActionMap[keyof UiSlotActionMap];

/**
 * Feature modules extend this map with their owned data-reference contracts.
 * The controller remains feature-agnostic while retaining a concrete,
 * JSON-serializable union in persisted state.
 */
export interface UiSlotDataReferenceMap {}

export type UiSlotDataReference =
  UiSlotDataReferenceMap[keyof UiSlotDataReferenceMap];

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type UiSlot = {
  slotId: string;
  contentId: string;
  revision: number;
  compatibility?: Partial<
    Record<
      UiSlotsPlatform,
      {
        minimumVersion: string;
      }
    >
  >;
  validity?: {
    from?: string;
    until?: string;
  };
  widget: UiSlotWidget;
  actions?: UiSlotAction[];
  dataReferences?: UiSlotDataReference[];
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type UiSlotsScreenResponse = {
  contractVersion: 1;
  configurationVersion: string;
  screenId: UiSlotsScreenId;
  locale: string;
  publishedAt: string;
  slots: UiSlot[];
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type StoredScreenConfiguration = {
  response: UiSlotsScreenResponse;
  etag?: string;
  fetchedAt: number;
  capabilityCohort: string;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RenderedScreenConfiguration = {
  slotsById: Record<string, UiSlot>;
  slotIds: string[];
};

export type UiSlotsRequestStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UiSlotsDiagnostics {
  log(message: string, data?: Record<string, unknown>): void;
  error(error: Error, data?: Record<string, unknown>): void;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type UiSlotsControllerState = {
  enabled: boolean;
  screenConfigurations: Record<
    UiSlotsConfigurationKey,
    StoredScreenConfiguration
  >;
  renderedConfigurations: Record<
    UiSlotsConfigurationKey,
    RenderedScreenConfiguration
  >;
  activeConfigurationKeys: Partial<
    Record<UiSlotsScreenId, UiSlotsConfigurationKey>
  >;
  requestStatus: Partial<Record<UiSlotsScreenId, UiSlotsRequestStatus>>;
  dismissedContentIds: Record<string, number>;
};

export type UiSlotsControllerActions =
  | ControllerGetStateAction<
      typeof UI_SLOTS_CONTROLLER_NAME,
      UiSlotsControllerState
    >
  | RemoteFeatureFlagControllerGetStateAction;

export type UiSlotsControllerEvents =
  | ControllerStateChangeEvent<
      typeof UI_SLOTS_CONTROLLER_NAME,
      UiSlotsControllerState
    >
  | RemoteFeatureFlagControllerStateChangeEvent;

export type UiSlotsControllerMessenger = Messenger<
  typeof UI_SLOTS_CONTROLLER_NAME,
  UiSlotsControllerActions | UiSlotsDataServiceActions,
  UiSlotsControllerEvents
>;
