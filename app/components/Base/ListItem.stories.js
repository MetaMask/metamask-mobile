import React from 'react';
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import { storiesOf } from '@storybook/react-native';
import { action } from '@storybook/addon-actions';
import { text, boolean } from '@storybook/addon-knobs';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

import ListItem from './ListItem';
import Text from './Text';

const exampleItems = [
  {
    title: 'DAI',
    description: 'DAI stablecoin',
    amount: '0.3444',
    fiatAmount: 'USD 0.34',
  },
  {
    title: 'USDC',
    description: 'USDC stablecoin',
    amount: '134.3',
    fiatAmount: 'USD 1.34',
  },
  {
    title: 'BUSD',
    description: 'BUSD stablecoin',
    amount: '987.32',
    fiatAmount: 'USD 988',
  },
];

storiesOf('Components / Base / ListItem', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const title = text('Title', 'Blue Coffee', 'Details');
    const description = text('Description', 'delicious blue coffee', 'Details');
    const amount = text('Amount', '$50', 'Details');
    const fiatAmount = text('Secondary amount', 'EUR 40', 'Details');

    const showDate = boolean('Show date', true, 'Optional');
    const showDescription = boolean('Show description', true, 'Optional');
    const showFiatAmount = boolean('Show secondary amount', true, 'Optional');
    return (
      <SafeAreaView>
        <Text big centered primary>
          {`<ListItem>`} Component
        </Text>
        <Text primary>Example</Text>
        <ListItem>
          {showDate && (
            <ListItem.Date>February 2nd, 2022 at 11:46am</ListItem.Date>
          )}
          <ListItem.Content>
            <ListItem.Icon>
              <FontAwesome name="coffee" size={25} color="blue" />
            </ListItem.Icon>
            <ListItem.Body>
              <ListItem.Title>{title}</ListItem.Title>
              {showDescription && <Text>{description}</Text>}
            </ListItem.Body>
            <ListItem.Amounts>
              <ListItem.Amount>{amount}</ListItem.Amount>
              {showFiatAmount && (
                <ListItem.FiatAmount>{fiatAmount}</ListItem.FiatAmount>
              )}
            </ListItem.Amounts>
          </ListItem.Content>
        </ListItem>
        <Text primary>FlatList Example</Text>
        <FlatList
          data={exampleItems}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={{
                borderBottomWidth: StyleSheet.hairlineWidth,
              }}
              onPress={action(`onPress ${item.title}`)}
            >
              <ListItem>
                <ListItem.Content>
                  <ListItem.Icon>
                    <FontAwesome name="circle-o" size={25} />
                  </ListItem.Icon>
                  <ListItem.Body>
                    <ListItem.Title>{item.title}</ListItem.Title>
                    <Text>{item.description}</Text>
                  </ListItem.Body>
                  <ListItem.Amounts>
                    <ListItem.Amount>{item.amount}</ListItem.Amount>
                    <ListItem.FiatAmount>{item.fiatAmount}</ListItem.FiatAmount>
                  </ListItem.Amounts>
                </ListItem.Content>
              </ListItem>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.title}
        />
      </SafeAreaView>
    );
  });
