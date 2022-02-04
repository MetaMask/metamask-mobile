import React from 'react';

import { storiesOf } from '@storybook/react-native';
import { action } from '@storybook/addon-actions';
import { text, boolean, select } from '@storybook/addon-knobs';

import Alert, { AlertType } from './Alert';
import Text from './Text';
import { colors, fontStyles } from ' ../../../styles/common';
import EvilIcons from 'react-native-vector-icons/EvilIcons';

const styles = {
	alertIcon: {
		fontSize: 20,
		...fontStyles.bold,
		color: colors.yellow,
		marginRight: 6,
	},
};

storiesOf('Base / Alert', module)
	.addDecorator((getStory) => getStory())
	.add('Default', () => {
		const renderIconKnob = boolean('renderIcon', false);
		return (
			<Alert
				type={select('Type', [AlertType.Info, AlertType.Warning, AlertType.Error], AlertType.Warning)}
				small={boolean('small', false)}
				renderIcon={renderIconKnob ? () => <EvilIcons name="bell" style={styles.alertIcon} /> : () => null}
				onPress={action('onPress')}
			>
				<Text>{text('children', 'This is an Alert component')}</Text>
			</Alert>
		);
	});
