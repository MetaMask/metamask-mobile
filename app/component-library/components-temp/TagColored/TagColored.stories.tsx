// Internal dependencies.
import { default as TagColoredComponent } from './TagColored';
import { TagColor } from './TagColored.types';
import { SAMPLE_TAGCOLORED_PROPS } from './TagColored.constants';

const TagColoredStoryMeta = {
  title: 'Components Temp / TagColored',
  component: TagColoredComponent,
  argTypes: {
    color: {
      options: TagColor,
      control: {
        type: 'select',
      },
    },
    children: {
      control: { type: 'text' },
    },
  },
};

export default TagColoredStoryMeta;

export const TagColored = {
  args: {
    color: SAMPLE_TAGCOLORED_PROPS.color,
    children: SAMPLE_TAGCOLORED_PROPS.children,
  },
};
