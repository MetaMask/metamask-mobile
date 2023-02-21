/* eslint-disable no-console, react-native/no-inline-styles */

// Third party dependencies.
import React, { useState } from 'react';
import { View } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import { boolean } from '@storybook/addon-knobs';

// External dependencies.
import { mockTheme } from '../../../../../util/theme';
import Text, { TextVariant } from '../../../Texts/Text';

// Internal dependencies.
import SelectItem from './SelectItem';

const SelectItemExample = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const renderItem = (item: number) => (
    <SelectItem
      onPress={() => setSelectedIndex(item)}
      key={`item-${item}`}
      isSelected={item === selectedIndex}
    >
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
    </SelectItem>
  );

  return <React.Fragment>{[0, 1, 2].map(renderItem)}</React.Fragment>;
};

storiesOf('Component Library / SelectItem', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const groupId = 'Props';
    const selectedSelector = boolean('isSelected', false, groupId);

    return (
      <SelectItem isSelected={selectedSelector}>
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
      </SelectItem>
    );
  })
  .add('List', () => <SelectItemExample />);
