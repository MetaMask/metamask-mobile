import React from 'react';
import { SafeAreaView } from 'react-native';

import { storiesOf } from '@storybook/react-native';

import { action } from '@storybook/addon-actions';
import { text, boolean } from '@storybook/addon-knobs';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

import Box from './Box';
import Text from '../../../Base/Text';
import ListItem from '../../../Base/ListItem';

storiesOf('FiatOnRamp / Box', module)
	.addDecorator((getStory) => getStory())
	.add('Default', () => {
		const boxText = text('Content', 'This is a box');
		const label = text('Label', 'This is the label');
		const highlighted = boolean('Highlighted', false);
		const onPress = action('Box pressed');

		return (
			<SafeAreaView>
				<Text big centered primary>
					{`<Box>`} Component
				</Text>
				<Text primary>Example</Text>

				<Box highlighted={highlighted} label={label}>
					<Text>{boxText}</Text>
				</Box>

				<Text primary>Highlighted</Text>
				<Box highlighted>
					<Text>This is a highlighted box</Text>
				</Box>

				<Text primary>Pressable</Text>
				<Box onPress={onPress}>
					<Text>This is a presable box. Press me!</Text>
				</Box>

				<Text primary>{'<Box>'} as ListItem wrapper</Text>
				<Box>
					<ListItem.Content>
						<ListItem.Icon>
							<FontAwesome name="circle" size={25} />
						</ListItem.Icon>
						<ListItem.Body>
							<ListItem.Title>Item title</ListItem.Title>
							<Text>description</Text>
						</ListItem.Body>
						<ListItem.Amounts>
							<ListItem.Amount>12345</ListItem.Amount>
						</ListItem.Amounts>
					</ListItem.Content>
				</Box>
			</SafeAreaView>
		);
	});
