/* eslint-disable react/display-name */
// External dependencies.
import React from 'react';

// Internal dependencies.
import { default as BlockiesComponent } from './Blockies';

const BlockiesStoryMeta = {
  title: 'Component Library / Blockies',
  component: BlockiesComponent,
};

export default BlockiesStoryMeta;

export const Blockies = {
  render: (args: any) => (
    <BlockiesComponent
      {...args}
      accountAddress="0x10e08af911f2e489480fb2855b24771745d0198b50f5c55891369844a8c57092"
    />
  ),
};
