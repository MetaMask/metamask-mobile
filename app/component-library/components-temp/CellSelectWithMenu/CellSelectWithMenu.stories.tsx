// Internal dependencies.
import { default as CellSelectWithMenu } from './CellSelectWithMenu';
import { SAMPLE_CELLSELECT_WITH_BUTTON_PROPS } from './CellSelectWithMenu.constants';

const CellSelectWithMenuMeta = {
  title: 'Component Library / Cells',
  component: CellSelectWithMenu,
  argTypes: {
    title: {
      control: { type: 'text' },
      defaultValue: SAMPLE_CELLSELECT_WITH_BUTTON_PROPS.title,
    },
    secondaryText: {
      control: { type: 'text' },
      defaultValue: SAMPLE_CELLSELECT_WITH_BUTTON_PROPS.secondaryText,
    },
    tertiaryText: {
      control: { type: 'text' },
      defaultValue: SAMPLE_CELLSELECT_WITH_BUTTON_PROPS.tertiaryText,
    },
    tagLabel: {
      control: { type: 'text' },
      defaultValue: SAMPLE_CELLSELECT_WITH_BUTTON_PROPS.tagLabel,
    },
    isSelected: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_CELLSELECT_WITH_BUTTON_PROPS.isSelected,
    },
    isDisabled: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_CELLSELECT_WITH_BUTTON_PROPS.isDisabled,
    },
    withAvatar: {
      control: { type: 'boolean' },
      defaultValue: true,
    },
    showSecondaryTextIcon: {
      control: { type: 'boolean' },
      defaultValue: true,
    },
    onTextClick: {
      action: 'clicked',
    },
  },
};

export default CellSelectWithMenuMeta;

export const CellMultiSelectWithMenu = {
  args: {
    avatarProps: SAMPLE_CELLSELECT_WITH_BUTTON_PROPS.avatarProps,
  },
};
