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
import MultiselectItem from './MultiselectItem';

const MultiselectItemExample = () => {
  const [data, setData] = useState([true, true, false]);

  const renderItem = (isSelected: boolean, index: number) => (
    <MultiselectItem
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
        <Text variant={TextVariant.BodySM}>{'Wrapped Content'}</Text>
      </View>
    </MultiselectItem>
  );

  return <React.Fragment>{data.map(renderItem)}</React.Fragment>;
};

storiesOf('Component Library / MultiselectItem', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const groupId = 'Props';
    const selectedSelector = boolean('isSelected', false, groupId);

    return (
      <MultiselectItem isSelected={selectedSelector}>
        <View
          style={{
            height: 50,
            flex: 1,
            backgroundColor: mockTheme.colors.background.alternative,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant={TextVariant.BodySM}>{'Wrapped Content'}</Text>
        </View>
      </MultiselectItem>
    );
  })
  .add('Multilist', () => <MultiselectItemExample />);
