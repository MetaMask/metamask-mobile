/* eslint-disable @typescript-eslint/consistent-type-definitions */
import { TransactionMeta } from '@metamask/transaction-controller';
import {
  BOTTOM_SHEET_NAMES,
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  MONEY_ONBOARDING_STEP_ACTIONS,
  MONEY_TOOLTIP_NAMES,
  MONEY_TOOLTIP_TYPES,
  MONEY_URLS,
  SCREEN_NAMES,
} from '../constants/moneyEvents';

/**
 * Properties for tracking location-based events.
 * screen_name: The name of the screen the event occurred on.
 * component_name: The name of the component the event occurred on.
 * bottom_sheet_name: The name of the bottom sheet the event occurred on.
 */
export type MoneyLocationEventProperties = {
  screen_name: SCREEN_NAMES;
  bottom_sheet_name: BOTTOM_SHEET_NAMES;
  component_name: COMPONENT_NAMES;
};

export type MoneyCardEventProperties = {
  is_card_holder: boolean;
  is_card_linked_to_money_account: boolean;
};

type MoneyFundedEventProperties = {
  is_account_funded: boolean | null;
  is_money_balance_loading: boolean;
};

export type MoneyRedirectEventProperties = {
  redirect_target: SCREEN_NAMES | BOTTOM_SHEET_NAMES | MONEY_URLS;
};

export type MoneySurfaceClickedEventProperties = MoneyRedirectEventProperties &
  Partial<MoneyLocationEventProperties>;

export type MoneyTokenSurfaceClickedEventProperties =
  MoneySurfaceClickedEventProperties & MoneyTokenRowEventProperties;

export type MoneyActivitySurfaceClickedEventProperties =
  MoneySurfaceClickedEventProperties & {
    transaction: TransactionMeta;
  };

/**
 * Base properties for all Money events.
 */
export type MoneyBaseEventProperties = Partial<MoneyLocationEventProperties> &
  MoneyCardEventProperties &
  MoneyFundedEventProperties;

type MoneyTokenRowEventProperties = {
  token_symbol: string;
  token_position_in_list: number;
  token_chain_id: string;
  tokens_in_list: number;
};

export type MoneyTokenRowButtonClickedEventProperties =
  MoneyButtonClickedEventProperties & MoneyTokenRowEventProperties;

export type MoneyTokenRowButtonClickedInputProperties =
  MoneyButtonClickedInputProperties & MoneyTokenRowEventProperties;

export type MoneyButtonClickedEventProperties =
  | ({
      button_type: MONEY_BUTTON_TYPES.TEXT;
    } & MoneyTextButtonClickedEventProperties)
  | ({
      button_type: MONEY_BUTTON_TYPES.ICON;
    } & MoneyIconButtonClickedEventProperties);

/**
 * Properties shared by every button-clicked variant, regardless of label.
 */
type MoneyButtonClickedBaseProperties = Partial<
  Pick<MoneyLocationEventProperties, 'component_name'>
> &
  Partial<MoneyRedirectEventProperties> & {
    button_intent: MONEY_BUTTON_INTENTS;
    /** 1-based index of the button position in a button row. */
    button_position?: number;
    /** Number of buttons in the button row. */
    button_row_button_count?: number;
  };

/** The resolved label pair as sent in the event payload. */
type MoneyButtonLabel = {
  label_en: string;
  label_localized: string;
};

export type MoneyTextButtonClickedEventProperties =
  MoneyButtonClickedBaseProperties & MoneyButtonLabel;

type MoneyIconButtonClickedEventProperties = MoneyButtonClickedBaseProperties;

/**
 * Callers may either supply the resolved `label_en`/`label_localized` pair
 * (for dynamically computed labels) or a single `label_key` (an i18n key) that
 * the hook resolves into both. The two forms are mutually exclusive so a label
 * and its key can never contradict.
 */
type MoneyButtonLabelInput =
  | (MoneyButtonLabel & { label_key?: never })
  | { label_key: string; label_en?: never; label_localized?: never };

type MoneyTextButtonClickedInputProperties = MoneyButtonClickedBaseProperties &
  MoneyButtonLabelInput;

/**
 * Input accepted by `trackButtonClicked`. Differs from the payload type only in
 * that the TEXT variant additionally accepts `label_key`.
 */
export type MoneyButtonClickedInputProperties =
  | ({
      button_type: MONEY_BUTTON_TYPES.TEXT;
    } & MoneyTextButtonClickedInputProperties)
  | ({
      button_type: MONEY_BUTTON_TYPES.ICON;
    } & MoneyIconButtonClickedEventProperties);

export type MoneyOnboardingEventProperties =
  Partial<MoneyRedirectEventProperties> & {
    step: number;
    step_title: string;
    step_action?: MONEY_ONBOARDING_STEP_ACTIONS;
    total_steps: number;
  };

export type MoneyTooltipClickedEventProperties =
  Partial<MoneyLocationEventProperties> & {
    tooltip_name: MONEY_TOOLTIP_NAMES;
    tooltip_type: MONEY_TOOLTIP_TYPES;
  };
