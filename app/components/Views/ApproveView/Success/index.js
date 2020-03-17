import React, { PureComponent } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../../styles/common';
import AntDesign from 'react-native-vector-icons/AntDesign';
import StyledButton from '../../../UI/StyledButton';
import { strings } from '../../../../../locales/i18n';

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: colors.white,
		flexDirection: 'column',
		alignItems: 'center'
	},
	title: {
		...fontStyles.normal,
		fontSize: 24,
		lineHeight: 34,
		color: colors.black,
		marginVertical: 20
	},
	description: {
		...fontStyles.normal,
		fontSize: 14,
		lineHeight: 20,
		color: colors.grey500,
		marginVertical: 20,
		marginHorizontal: 70,
		textAlign: 'center'
	},
	buttonsWrapper: {
		flex: 1,
		marginVertical: 12,
		marginHorizontal: 24,
		flexDirection: 'row',
		alignSelf: 'flex-end'
	},
	buttonsContainer: {
		flex: 1,
		flexDirection: 'column',
		alignSelf: 'flex-end'
	},
	iconWrapper: {
		marginTop: 120
	}
});

export default class Success extends PureComponent {
	static propTypes = {
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object
	};

	close = () => {
		this.props.navigation.dismiss();
	};

	render = () => (
		<SafeAreaView style={styles.root} testID={'approve-success-screen'}>
			<View style={styles.iconWrapper}>
				<AntDesign name={'checkcircleo'} size={95} color={colors.green400} />
			</View>
			<Text style={styles.title}>{strings('spend_limit_edition.all_set')}</Text>
			<Text style={styles.description}>{strings('spend_limit_edition.all_set_desc')}</Text>
			<View style={styles.buttonsWrapper}>
				<View style={styles.buttonsContainer}>
					<StyledButton
						type="confirm"
						onPress={this.close}
						containerStyle={styles.close}
						testID={'approve-success-close-button'}
					>
						{strings('spend_limit_edition.close')}
					</StyledButton>
				</View>
			</View>
		</SafeAreaView>
	);
}
