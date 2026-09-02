import type {
  ControllerGetStateAction,
  ControllerStateChangeEvent,
} from '@metamask/base-controller';
import type { Messenger } from '@metamask/messenger';
import type {
  RemoteFeatureFlagControllerGetStateAction,
  RemoteFeatureFlagControllerStateChangeEvent,
} from '@metamask/remote-feature-flag-controller';

export const UI_SLOTS_CONTROLLER_NAME = 'UiSlotsController' as const;

/**
 * Feature modules extend these maps with the screens, widgets and
 * data-reference contracts they own, so the controller stays feature-agnostic
 * while persisted state keeps a concrete, JSON-serializable union.
 */
export interface UiSlotsScreenIdMap {}

export interface UiSlotWidgetMap {}

export interface UiSlotDataReferenceMap {}

export type UiSlotsScreenId = keyof UiSlotsScreenIdMap & string;

export type UiSlotWidget = UiSlotWidgetMap[keyof UiSlotWidgetMap];

export type UiSlotDataReference =
  UiSlotDataReferenceMap[keyof UiSlotDataReferenceMap];

// State-bearing shapes stay type aliases: `BaseController`'s state constraint
// needs the implicit index signature that interfaces do not get.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type UiSlot = {
  slotId: string;
  contentId: string;
  revision: number;
  widget: UiSlotWidget;
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
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ActiveScreenConfiguration = {
  configurationKey: string;
  slotsById: Record<string, UiSlot>;
};

export interface UiSlotsDiagnostics {
  log(message: string, data?: Record<string, unknown>): void;
  error(error: Error, data?: Record<string, unknown>): void;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type UiSlotsControllerState = {
  enabled: boolean;
  screenConfigurations: Record<string, StoredScreenConfiguration>;
  /**
   * Interpreted slots for the configuration currently on screen. Derived from
   * `screenConfigurations`, so it is never persisted.
   */
  activeConfigurations: Partial<
    Record<UiSlotsScreenId, ActiveScreenConfiguration>
  >;
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
  UiSlotsControllerActions,
  UiSlotsControllerEvents
>;
