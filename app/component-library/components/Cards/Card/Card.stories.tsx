/* eslint-disable react/display-name */
/* eslint-disable no-console, react-native/no-inline-styles */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { mockTheme } from '../../../../util/theme';
import Text, { TextVariant } from '../../Texts/Text';

// Internal dependencies.
import { default as CardComponent } from './Card';

const CardStoryMeta = {
  title: 'Component Library / Cards',
  component: CardComponent,
};

export default CardStoryMeta;

export const Card = {
  render: () => (
    <CardComponent>
      <View
        style={{
          height: 50,
          backgroundColor: mockTheme.colors.background.alternative,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant={TextVariant.BodySM}>{'Wrapped Content'}</Text>
      </View>
    </CardComponent>
  ),
};
