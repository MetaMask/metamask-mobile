// Internal dependencies.
import { default as CellDisplayComponent } from './CellDisplay';
import { SAMPLE_CELLDISPLAY_PROPS } from './CellDisplay.constants';

const CellDisplayMeta = {
  title: 'Component Library / Cells',
  component: CellDisplayComponent,
  argTypes: {
    title: {
      control: { type: 'text' },
      defaultValue: SAMPLE_CELLDISPLAY_PROPS.title,
    },
    secondaryText: {
      control: { type: 'text' },
      defaultValue: SAMPLE_CELLDISPLAY_PROPS.secondaryText,
    },
    tertiaryText: {
      control: { type: 'text' },
      defaultValue: SAMPLE_CELLDISPLAY_PROPS.tertiaryText,
    },
    tagLabel: {
      control: { type: 'text' },
      defaultValue: SAMPLE_CELLDISPLAY_PROPS.tagLabel,
    },
  },
};
export default CellDisplayMeta;

export const CellDisplay = {
  args: {
    avatarProps: SAMPLE_CELLDISPLAY_PROPS.avatarProps,
  },
};
