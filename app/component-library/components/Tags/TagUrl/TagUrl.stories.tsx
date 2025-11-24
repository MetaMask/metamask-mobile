/* eslint-disable no-console */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/display-name */
// External dependencies.
import React from 'react';
import { View } from 'react-native';

// Internal dependencies.
import { default as TagUrlComponent } from './TagUrl';
import { SAMPLE_TAGURL_PROPS } from './TagUrl.constants';

const TagUrlMeta = {
  title: 'Component Library / Tags',
  component: TagUrlComponent,
  argTypes: {
    label: {
      control: { type: 'text' },
      defaultValue: SAMPLE_TAGURL_PROPS.label,
    },
    ctaLabel: {
      control: { type: 'text' },
      defaultValue: SAMPLE_TAGURL_PROPS.cta?.label,
    },
  },
};
export default TagUrlMeta;

export const TagUrl = {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: ({ label, ctaLabel }: any) => (
    <View style={{ alignItems: 'flex-start' }}>
      <TagUrlComponent
        label={label}
        imageSource={SAMPLE_TAGURL_PROPS.imageSource}
        cta={{ label: ctaLabel, onPress: () => console.log('CTA pressed') }}
      />
    </View>
  ),
};
