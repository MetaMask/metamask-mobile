/* eslint-disable no-console, react-native/no-inline-styles */
import React, { useState } from 'react';
import { storiesOf } from '@storybook/react-native';
import SelectableListItem from './SelectableListItem';
import { boolean } from '@storybook/addon-knobs';
import { View } from 'react-native';
import { mockTheme } from '../../../util/theme';
import BaseText, { BaseTextVariant } from '../BaseText';

const SelectableListItemExample = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const renderItem = (item: number) => (
    <SelectableListItem
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
        <BaseText variant={BaseTextVariant.sBodySM}>
          {'Wrapped Content'}
        </BaseText>
      </View>
    </SelectableListItem>
  );

  return <React.Fragment>{[0, 1, 2].map(renderItem)}</React.Fragment>;
};

storiesOf('Component Library / SelectableListItem', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const groupId = 'Props';
    const selectedSelector = boolean('isSelected', false, groupId);

    return (
      <SelectableListItem isSelected={selectedSelector}>
        <View
          style={{
            height: 50,
            backgroundColor: mockTheme.colors.background.alternative,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <BaseText variant={BaseTextVariant.sBodySM}>
            {'Wrapped Content'}
          </BaseText>
        </View>
      </SelectableListItem>
    );
  })
  .add('List', () => <SelectableListItemExample />);
