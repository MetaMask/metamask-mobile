// Internal dependencies.
import { default as CellMultiSelectComponent } from './CellMultiSelect';
import { SAMPLE_CELLMULTISELECT_PROPS } from './CellMultiSelect.constants';

const CellMultiSelectMeta = {
  title: 'Component Library / Cells',
  component: CellMultiSelectComponent,
  argTypes: {
    title: {
      control: { type: 'text' },
      defaultValue: SAMPLE_CELLMULTISELECT_PROPS.title,
    },
    secondaryText: {
      control: { type: 'text' },
      defaultValue: SAMPLE_CELLMULTISELECT_PROPS.secondaryText,
    },
    tertiaryText: {
      control: { type: 'text' },
      defaultValue: SAMPLE_CELLMULTISELECT_PROPS.tertiaryText,
    },
    tagLabel: {
      control: { type: 'text' },
      defaultValue: SAMPLE_CELLMULTISELECT_PROPS.tagLabel,
    },
    isSelected: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_CELLMULTISELECT_PROPS.isSelected,
    },
    isDisabled: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_CELLMULTISELECT_PROPS.isDisabled,
    },
  },
};
export default CellMultiSelectMeta;

export const CellMultiSelect = {
  args: {
    avatarProps: SAMPLE_CELLMULTISELECT_PROPS.avatarProps,
  },
};
