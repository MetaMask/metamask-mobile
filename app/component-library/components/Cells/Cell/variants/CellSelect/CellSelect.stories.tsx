// Internal dependencies.
import { default as CellSelectComponent } from './CellSelect';
import { SAMPLE_CELLSELECT_PROPS } from './CellSelect.constants';

const CellSelectMeta = {
  title: 'Component Library / Cells',
  component: CellSelectComponent,
  argTypes: {
    title: {
      control: { type: 'text' },
      defaultValue: SAMPLE_CELLSELECT_PROPS.title,
    },
    secondaryText: {
      control: { type: 'text' },
      defaultValue: SAMPLE_CELLSELECT_PROPS.secondaryText,
    },
    tertiaryText: {
      control: { type: 'text' },
      defaultValue: SAMPLE_CELLSELECT_PROPS.tertiaryText,
    },
    tagLabel: {
      control: { type: 'text' },
      defaultValue: SAMPLE_CELLSELECT_PROPS.tagLabel,
    },
    isSelected: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_CELLSELECT_PROPS.isSelected,
    },
    isDisabled: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_CELLSELECT_PROPS.isDisabled,
    },
  },
};
export default CellSelectMeta;

export const CellSelect = {
  args: {
    avatarProps: SAMPLE_CELLSELECT_PROPS.avatarProps,
  },
};
