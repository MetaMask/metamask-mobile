/* eslint-disable react/display-name */
// Third party dependencies
import React from 'react';

// Internal dependencies
import { default as TagBaseComponent } from './TagBase';
import { SAMPLE_TAGBASE_PROPS } from './TagBase.constants';
import { TagShape, TagSeverity } from './TagBase.types';

const TagBaseMeta = {
  title: 'Component Library Base / TagBase',
  component: TagBaseComponent,
  argTypes: {
    children: {
      control: { type: 'text' },
    },
    severity: {
      options: TagSeverity,
      control: {
        type: 'select',
      },
    },
    shape: {
      options: TagShape,
      control: {
        type: 'select',
      },
    },
    gap: {
      control: {
        type: 'number',
        min: 0,
      },
    },
    showSampleStartAccessory: {
      control: {
        type: 'boolean',
      },
    },
    includesBorder: {
      control: {
        type: 'boolean',
      },
    },
    showSampleEndAccessory: {
      control: {
        type: 'boolean',
      },
    },
  },
};
export default TagBaseMeta;

export const TagBase = {
  args: {
    children: SAMPLE_TAGBASE_PROPS.children,
    shape: SAMPLE_TAGBASE_PROPS.shape,
    gap: SAMPLE_TAGBASE_PROPS.gap,
    severity: SAMPLE_TAGBASE_PROPS.severity,
    showSampleStartAccessory: false,
    showSampleEndAccessory: false,
    includesBorder: false,
  },
  render: (args: any) => (
    <TagBaseComponent
      startAccessory={
        args.showSampleStartAccessory && SAMPLE_TAGBASE_PROPS.startAccessory
      }
      endAccessory={
        args.showSampleEndAccessory && SAMPLE_TAGBASE_PROPS.endAccessory
      }
      shape={args.shape}
      severity={args.severity}
      gap={args.gap}
      includesBorder={args.includesBorder}
    >
      {args.children}
    </TagBaseComponent>
  ),
};
