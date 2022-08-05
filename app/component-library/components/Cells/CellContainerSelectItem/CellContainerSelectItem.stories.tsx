/* eslint-disable no-console, react-native/no-inline-styles */

// Third party dependencies.
import React, { useState } from 'react';
import { View } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import { boolean } from '@storybook/addon-knobs';

// External dependencies.
import { mockTheme } from '../../../../util/theme';
import Text, { TextVariant } from '../../Text';

// Internal dependencies.
import CellContainerSelectItem from './CellContainerSelectItem';

const CellContainerSelectItemExample = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const renderItem = (item: number) => (
    <CellContainerSelectItem
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
        <Text variant={TextVariant.sBodySM}>{'Wrapped Content'}</Text>
      </View>
    </CellContainerSelectItem>
  );

  return <React.Fragment>{[0, 1, 2].map(renderItem)}</React.Fragment>;
};

storiesOf('Component Library / CellContainerSelectItem', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const groupId = 'Props';
    const selectedSelector = boolean('isSelected', false, groupId);

    return (
      <CellContainerSelectItem isSelected={selectedSelector}>
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
      </CellContainerSelectItem>
    );
  })
  .add('List', () => <CellContainerSelectItemExample />);
