import React from 'react';
import { SafeAreaView } from 'react-native';
import { storiesOf } from '@storybook/react-native';

import { action } from '@storybook/addon-actions';
import { text, boolean } from '@storybook/addon-knobs';

import FontAwesome from 'react-native-vector-icons/FontAwesome';

import AssetSelectorButton from './AssetSelectorButton';
import Text from '../../../Base/Text';

storiesOf('FiatOnRamp / AssetSelectorButton', module)
	.addDecorator((getStory) => getStory())
	.add('Default', () => {
		const highlighted = boolean('Highlighted', false);
		const label = text('Box label', 'Amount');
		const assetSymbol = text('Asset Symbol', 'ETH');

		const assetName = text('Asset Name', 'Ethereum');
		const onPress = action('AssetSelectorButton pressed');

		return (
			<SafeAreaView>
				<Text big centered primary>
					{`<AssetSelectorButton>`} Component
				</Text>
				<Text primary>Example</Text>
				<AssetSelectorButton
					highlighted={highlighted}
					label={label}
					icon={<FontAwesome name="circle" size={32} />}
					assetSymbol={assetSymbol}
					assetName={assetName}
					onPress={onPress}
				/>
			</SafeAreaView>
		);
	});
