/* eslint-disable import/prefer-default-export */

// External dependencies.
import { TextColor, TextVariant } from '../../Texts/Text';

// Internal dependencies.
import {
  HelpTextSeverity,
  TextColorByHelpTextSeverity,
  HelpTextProps,
} from './HelpText.types';

// Defaults
export const DEFAULT_HELPTEXT_SEVERITY = HelpTextSeverity.Default;
export const DEFAULT_HELPTEXT_TEXT_VARIANT = TextVariant.BodySM;

// Test IDs
export const HELPTEXT_TEST_ID = 'helptext';

// Mappings
export const TEXT_COLOR_BY_HELPTEXT_SEVERITY: TextColorByHelpTextSeverity = {
  [HelpTextSeverity.Default]: TextColor.Default,
  [HelpTextSeverity.Error]: TextColor.Error,
  [HelpTextSeverity.Success]: TextColor.Success,
};

// Sample consts
export const SAMPLE_HELPTEXT_TEXT = 'Sample HelpText Text';
export const SAMPLE_LIST_ITEM_PROPS: HelpTextProps = {
  severity: DEFAULT_HELPTEXT_SEVERITY,
  children: SAMPLE_HELPTEXT_TEXT,
};
