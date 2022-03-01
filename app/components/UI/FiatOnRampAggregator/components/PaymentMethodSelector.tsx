import React, { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Box from './Box';

import ListItemBase from '../../../Base/ListItem';
import TextBase from '../../../Base/Text';

const ListItem = ListItemBase as any;
const Text = TextBase as any;

const styles = StyleSheet.create({
	name: {
		fontSize: 14,
	},
});

interface IProps {
	id?: string;
	name?: string;
	label?: string;
	icon?: ReactNode;
	highlighted?: boolean;
	onPress?: () => void;
}

const AssetSelectorButton: React.FC<IProps> = ({ name, icon, label, highlighted, onPress }: IProps) => (
	<Box label={label} onPress={onPress} highlighted={highlighted}>
		<View>
			<ListItem.Content>
				{Boolean(icon) && <ListItem.Icon>{icon}</ListItem.Icon>}
				<ListItem.Body>
					<Text black bold style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
						{name}
					</Text>
				</ListItem.Body>
			</ListItem.Content>
		</View>
	</Box>
);

export default AssetSelectorButton;
