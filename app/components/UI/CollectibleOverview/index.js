import React, { PureComponent } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import CollectibleImage from '../CollectibleImage';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1
	},
	basicsWrapper: {
		flex: 1,
		padding: 25,
		alignItems: 'center',
		justifyContent: 'center'
	},
	label: {
		fontSize: 16,
		...fontStyles.bold
	},
	informationWrapper: {
		flex: 1,
		paddingHorizontal: 30
	},
	information: {
		marginTop: 16
	},
	content: {
		fontSize: 14,
		color: colors.grey400,
		paddingTop: 10,
		...fontStyles.normal
	},
	row: {
		marginVertical: 10
	},
	name: {
		fontSize: 24,
		...fontStyles.normal
	},
	tokenId: {
		fontSize: 12,
		color: colors.grey400,
		marginTop: 8,
		...fontStyles.normal
	}
});

/**
 * View that displays the information of a specific ERC-721 Token
 */
export default class CollectibleOverview extends PureComponent {
	static propTypes = {
		/**
		 * Object that represents the collectible to be displayed
		 */
		collectible: PropTypes.object
	};

	renderImage = () => {
		const { collectible } = this.props;
		return <CollectibleImage renderFull collectible={collectible} />;
	};

	render = () => {
		const {
			collectible: { name, tokenId },
			collectible
		} = this.props;
		let description;
		if (collectible.description) {
			description = collectible.description;
		}
		return (
			<View style={styles.wrapper}>
				<View style={styles.basicsWrapper}>
					<View>{this.renderImage()}</View>
				</View>

				<View style={styles.informationWrapper}>
					<Text style={styles.name}>{name}</Text>
					<Text style={styles.tokenId}>
						{strings('unit.token_id')}
						{tokenId}
					</Text>
					{description && (
						<View style={styles.information}>
							<View style={styles.row}>
								<Text style={styles.label}>{strings('collectible.collectible_description')}</Text>
								<Text style={styles.content}>{description}</Text>
							</View>
						</View>
					)}
				</View>
			</View>
		);
	};
}
