import {
  EARN_MODULE_BUTTON_INTENTS,
  EARN_MODULE_BUTTON_TYPES,
  EARN_MODULE_COMPONENT_NAMES,
  EARN_MODULE_ENTRY_POINTS,
  EARN_MODULE_REDIRECT_TARGETS,
  EARN_MODULE_REDIRECT_TARGET_TYPES,
  EARN_MODULE_STRATEGY_TYPES,
  EARN_MODULE_BOTTOM_SHEET_NAMES,
  EARN_MODULE_SCREEN_NAMES,
} from '../constants/earnModuleEvents';

export interface EarnModuleLocationProperties {
  screen_name?: EARN_MODULE_SCREEN_NAMES;
  component_name?: EARN_MODULE_COMPONENT_NAMES;
  bottom_sheet_name?: EARN_MODULE_BOTTOM_SHEET_NAMES;
  /** Entry point for the tracked Earn flow (e.g. homepage, explore_now_tab, explore_crypto_tab, explore_search) */
  entry_point: EARN_MODULE_ENTRY_POINTS;
}

export interface EarnModuleAnalyticsContext {
  /** Entry point for the tracked Earn flow (e.g. homepage, explore_now_tab, explore_crypto_tab, explore_search) */
  entry_point: EARN_MODULE_ENTRY_POINTS;
  /** Screen name of the current screen. */
  screen_name?: EARN_MODULE_SCREEN_NAMES;
  /** One-based asset position in rendered list. */
  asset_position?: number;
  assets_in_list?: number;
}

export interface EarnModuleAssetProperties {
  asset_symbol?: string;
  asset_address?: string;
  chain_id?: string;
  /** One-based asset position in the rendered list. */
  asset_position?: number;
  /** Number of assets in the rendered list. */
  assets_in_list?: number;
  asset_has_balance?: boolean;
  eligible_strategy_count?: number;
  eligible_strategy_types?: Lowercase<EARN_MODULE_STRATEGY_TYPES>[];
  is_fee_subsidized?: boolean;
  rate_percentage?: number;
}

export interface EarnModuleStrategyProperties {
  selected_strategy_type?: Lowercase<EARN_MODULE_STRATEGY_TYPES>;
  /** One-based strategy position in list. */
  selected_strategy_position?: number;
  rate_type?: 'apr' | 'apy';
  selected_strategy_rate_percentage?: number;
  /** Whether the selected strategy has fee subsidization. */
  is_fee_subsidized?: boolean;
}

export interface EarnModuleRedirectProperties {
  redirect_target?: EARN_MODULE_REDIRECT_TARGETS;
  redirect_target_type?: EARN_MODULE_REDIRECT_TARGET_TYPES;
}

export type EarnModuleSurfaceViewedProperties = Partial<
  EarnModuleAssetProperties & EarnModuleStrategyProperties
> &
  Partial<
    Pick<
      EarnModuleLocationProperties,
      'screen_name' | 'component_name' | 'bottom_sheet_name'
    >
  >;

export type EarnModuleSurfaceClickedProperties = Partial<
  EarnModuleAssetProperties & EarnModuleStrategyProperties
> &
  Partial<EarnModuleRedirectProperties> & {
    component_name: EARN_MODULE_COMPONENT_NAMES;
  };

type EarnModuleButtonBaseProperties = Partial<
  EarnModuleAssetProperties & EarnModuleStrategyProperties
> &
  Partial<EarnModuleRedirectProperties> & {
    component_name?: EARN_MODULE_COMPONENT_NAMES;
    button_intent: EARN_MODULE_BUTTON_INTENTS;
    /** One-based button position within its group. */
    button_position?: number;
    /** Number of buttons in the containing row. */
    button_row_button_count?: number;
  };

type EarnModuleButtonLabelInput =
  | {
      label_key: string;
      label_en?: never;
      label_localized?: never;
    }
  | {
      label_key?: never;
      /** English label displayed for the clicked button. */
      label_en: string;
      /** Localized label displayed for the clicked button. */
      label_localized: string;
    };

export type EarnModuleButtonClickedProperties =
  | (EarnModuleButtonBaseProperties & {
      button_type: EARN_MODULE_BUTTON_TYPES.ICON;
    })
  | (EarnModuleButtonBaseProperties & {
      button_type: EARN_MODULE_BUTTON_TYPES.TEXT;
    } & EarnModuleButtonLabelInput);
