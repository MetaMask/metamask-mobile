import React from 'react';

import { storiesOf } from '@storybook/react-native';
import { action } from '@storybook/addon-actions';
import { text, boolean, select } from '@storybook/addon-knobs';
import ButtonReveal from './index';

storiesOf('UI / ButtonReveal', module)
	.addDecorator((getStory) => getStory())
	.add('Default', () => {
		return (
			<ButtonReveal
				label={'Hold to reveal SRP'}
				onLongPress={() => {
					console.log('Revealing SRP');
				}}
			/>
		);
	});
