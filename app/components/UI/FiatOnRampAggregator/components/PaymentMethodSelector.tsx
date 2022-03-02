import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import Box from './Box';
import Entypo from 'react-native-vector-icons/Entypo';

import ListItemBase from '../../../Base/ListItem';
import TextBase from '../../../Base/Text';
import { colors } from '../../../../styles/common';

const ListItem = ListItemBase as any;
const Text = TextBase as any;

const styles = StyleSheet.create({
	chevron: {
		marginLeft: 10,
		color: colors.grey500,
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
	<Box label={label} onPress={onPress} highlighted={highlighted} thin>
		<View>
			<ListItem.Content>
				{Boolean(icon) && <ListItem.Icon>{icon}</ListItem.Icon>}
				<ListItem.Body>
					<Text black bold numberOfLines={1} adjustsFontSizeToFit>
						{name}
					</Text>
				</ListItem.Body>
				<ListItem.Amount>
					<Entypo name="chevron-right" size={16} style={styles.chevron} />
				</ListItem.Amount>
			</ListItem.Content>
		</View>
	</Box>
);

export default AssetSelectorButton;
