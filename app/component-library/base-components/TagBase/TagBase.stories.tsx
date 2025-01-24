/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/display-name */
// Third party dependencies
import React from 'react';
import { View } from 'react-native';

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
    includesBorder: {
      control: {
        type: 'boolean',
      },
    },
    startAccessory: {
      control: {
        type: 'boolean',
        description: 'Show startAccessory',
      },
    },
    endAccessory: {
      control: {
        type: 'boolean',
        description: 'Show endAccessory',
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
    startAccessory: false,
    endAccessory: false,
    includesBorder: false,
  },
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (args: any) => (
    <View
      style={{
        padding: 12,
      }}
    >
      <TagBaseComponent
        startAccessory={
          args.startAccessory && SAMPLE_TAGBASE_PROPS.startAccessory
        }
        endAccessory={args.endAccessory && SAMPLE_TAGBASE_PROPS.endAccessory}
        shape={args.shape}
        severity={args.severity}
        gap={args.gap}
        includesBorder={args.includesBorder}
      >
        {args.children}
      </TagBaseComponent>
    </View>
  ),
};
