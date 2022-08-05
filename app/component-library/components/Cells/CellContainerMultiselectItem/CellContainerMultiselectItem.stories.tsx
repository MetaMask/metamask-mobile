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
import CellContainerMultiselectItem from './CellContainerMultiselectItem';

const CellContainerMultiselectItemExample = () => {
  const [data, setData] = useState([true, true, false]);

  const renderItem = (isSelected: boolean, index: number) => (
    <CellContainerMultiselectItem
      onPress={() => {
        const newData = [...data];
        newData[index] = !isSelected;
        setData(newData);
      }}
      key={`item-${index}`}
      isSelected={isSelected}
    >
      <View
        style={{
          height: 50,
          flex: 1,
          backgroundColor: mockTheme.colors.background.alternative,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant={TextVariant.sBodySM}>{'Wrapped Content'}</Text>
      </View>
    </CellContainerMultiselectItem>
  );

  return <React.Fragment>{data.map(renderItem)}</React.Fragment>;
};

storiesOf('Component Library / CellContainerMultiselectItem', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const groupId = 'Props';
    const selectedSelector = boolean('isSelected', false, groupId);

    return (
      <CellContainerMultiselectItem isSelected={selectedSelector}>
        <View
          style={{
            height: 50,
            flex: 1,
            backgroundColor: mockTheme.colors.background.alternative,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant={TextVariant.sBodySM}>{'Wrapped Content'}</Text>
        </View>
      </CellContainerMultiselectItem>
    );
  })
  .add('Multilist', () => <CellContainerMultiselectItemExample />);
