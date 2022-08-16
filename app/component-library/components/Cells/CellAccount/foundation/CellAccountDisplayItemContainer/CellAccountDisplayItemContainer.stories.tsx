/* eslint-disable no-console, react-native/no-inline-styles */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { mockTheme } from '../../../../../../util/theme';
import Text, { TextVariant } from '../../../../Text';

// Internal dependencies.
import CellAccountDisplayItemContainer from './CellAccountDisplayItemContainer';

storiesOf('Component Library / CellAccountDisplayItemContainer', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => (
    <CellAccountDisplayItemContainer>
      <View
        style={{
          height: 50,
          backgroundColor: mockTheme.colors.background.alternative,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant={TextVariant.sBodySM}>{'Wrapped Content'}</Text>
      </View>
    </CellAccountDisplayItemContainer>
  ));
