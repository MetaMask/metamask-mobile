import React from 'react';

import TagColored from './TagColored';
import { TagColor } from './TagColored.types';

const TagColoredMeta = {
  title: 'Components Temp / TagColored',
  component: TagColored,
  argTypes: {
    color: {
      options: Object.values(TagColor),
      control: { type: 'select' },
    },
    children: {
      control: 'text',
    },
  },
};

export default TagColoredMeta;

export const Default = {
  args: {
    color: TagColor.Default,
    children: 'Sample TagColored text',
  },
};

export const Success = {
  render: () => (
    <TagColored color={TagColor.Success}>Paid by MetaMask</TagColored>
  ),
};

export const Info = {
  render: () => <TagColored color={TagColor.Info}>Info tag</TagColored>,
};

export const Danger = {
  render: () => <TagColored color={TagColor.Danger}>Error</TagColored>,
};

export const Warning = {
  render: () => <TagColored color={TagColor.Warning}>Pending</TagColored>,
};

export const WithNormalCase = {
  render: () => (
    <TagColored
      color={TagColor.Success}
      labelProps={{ style: { textTransform: 'none' } }}
    >
      Paid by MetaMask
    </TagColored>
  ),
};
