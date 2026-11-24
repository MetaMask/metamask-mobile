// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useTailwind } from '@metamask/design-system-twrnc-preset';

// Internal dependencies.
import { default as BannerCompactComponent } from './BannerCompact';
import type { BannerCompactProps } from './BannerCompact.types';

const BannerCompactMeta = {
  title: 'Components Temp / BannerCompact',
  component: BannerCompactComponent,
  argTypes: {
    title: {
      control: { type: 'text' },
      description: 'The banner title',
    },
    description: {
      control: { type: 'text' },
      description: 'The two-line description',
    },
    actionLabel: {
      control: { type: 'text' },
      description: 'Optional text action under the description',
    },
    thumbnailShape: {
      control: { type: 'select' },
      options: ['square', 'round'],
      description: 'Corner shape of the thumbnail slot',
    },
  },
};

export default BannerCompactMeta;

/** A stand-in for a thumbnail node, e.g. a Rive animation. */
const NodeThumbnail = () => {
  const tw = useTailwind();
  return <View style={tw.style('h-[72px] w-[72px] rounded-xl bg-alternate')} />;
};

const thumbnailArgs: Pick<BannerCompactProps, 'thumbnail' | 'thumbnailShape'> =
  {
    thumbnail: <NodeThumbnail />,
  };

export const PressableRow = {
  args: {
    ...thumbnailArgs,
    title: 'Verify your identity',
    description:
      'This usually takes a few minutes. You can leave and come back.',
    actionLabel: 'Continue',
    onPress: () => undefined,
  },
};

export const StaticRow = {
  args: {
    ...thumbnailArgs,
    title: 'Verifying your identity',
    description:
      'We’re reviewing your details. We’ll let you know when the check is complete.',
  },
};

export const RoundThumbnail = {
  args: {
    ...PressableRow.args,
    thumbnailShape: 'round',
  },
};

export const DismissibleRow = {
  args: {
    ...StaticRow.args,
    onClose: () => undefined,
  },
};
