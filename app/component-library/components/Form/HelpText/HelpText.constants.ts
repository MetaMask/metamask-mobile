/* eslint-disable import/prefer-default-export */

// External dependencies.
import { TextColor } from '../../Texts/Text';

// Internal dependencies.
import {
  HelpTextSeverity,
  TextColorByHelpTextSeverity,
} from './HelpText.types';

// Defaults
export const DEFAULT_HELPTEXT_SEVERITY = HelpTextSeverity.Default;

// Mappings
export const TEXT_COLOR_BY_HELPTEXT_SEVERITY: TextColorByHelpTextSeverity = {
  [HelpTextSeverity.Default]: TextColor.Default,
  [HelpTextSeverity.Error]: TextColor.Error,
  [HelpTextSeverity.Info]: TextColor.Info,
  [HelpTextSeverity.Success]: TextColor.Success,
  [HelpTextSeverity.Warning]: TextColor.Warning,
};

// export const SAMPLE_LIST_ITEM_PROPS: ListItemProps = {
//   verticalAlignment: VerticalAlignmentOptions.Top,
// };
