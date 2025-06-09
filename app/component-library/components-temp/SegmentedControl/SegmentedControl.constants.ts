/* eslint-disable import/prefer-default-export */

// External dependencies.
import { ButtonSize } from '../../components/Buttons/Button/Button.types';

// Internal dependencies.
import {
  SegmentedControlProps,
  MultiSelectSegmentedControlProps,
  SingleSelectSegmentedControlProps,
} from './SegmentedControl.types';

// Defaults
export const DEFAULT_SEGMENTEDCONTROL_SIZE = ButtonSize.Md;

// Samples
export const SAMPLE_SEGMENTEDCONTROL_OPTIONS = [
  { value: 'mode1', label: 'Mode 1' },
  { value: 'mode2', label: 'Mode 2' },
  { value: 'mode3', label: 'Mode 3' },
  { value: 'mode4', label: 'Mode 4' },
];

export const SAMPLE_SINGLE_SEGMENTEDCONTROL_PROPS: SingleSelectSegmentedControlProps =
  {
    options: SAMPLE_SEGMENTEDCONTROL_OPTIONS,
    selectedValue: SAMPLE_SEGMENTEDCONTROL_OPTIONS[0].value,
    size: DEFAULT_SEGMENTEDCONTROL_SIZE,
    isMultiSelect: false,
  };

export const SAMPLE_MULTI_SEGMENTEDCONTROL_PROPS: MultiSelectSegmentedControlProps =
  {
    options: SAMPLE_SEGMENTEDCONTROL_OPTIONS,
    selectedValues: [
      SAMPLE_SEGMENTEDCONTROL_OPTIONS[0].value,
      SAMPLE_SEGMENTEDCONTROL_OPTIONS[2].value,
    ],
    size: DEFAULT_SEGMENTEDCONTROL_SIZE,
    isMultiSelect: true,
  };

// For backward compatibility
export const SAMPLE_SEGMENTEDCONTROL_PROPS: SegmentedControlProps =
  SAMPLE_SINGLE_SEGMENTEDCONTROL_PROPS;
