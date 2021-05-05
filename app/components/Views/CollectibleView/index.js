import React, { PureComponent } from 'react';
import { ScrollView, View, StyleSheet, SafeAreaView } from 'react-native';
import PropTypes from 'prop-types';
import CollectibleOverview from '../../UI/CollectibleOverview';
import { getNetworkNavbarOptions } from '../../UI/Navbar';
import { colors } from '../../../styles/common';
import { connect } from 'react-redux';
import collectiblesTransferInformation from '../../../util/collectibles-transfer';
import { newAssetTransaction } from '../../../actions/transaction';

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: colors.white
	},
	wrapper: {
		flex: 0.9
	}
});

/**
 * View that displays a specific collectible asset
 */
class CollectibleView extends PureComponent {
	static propTypes = {
		/**
		/* navigation object required to access the props
		/* passed by the parent component
		*/
		navigation: PropTypes.object,
		/**
		 * Start transaction with asset
		 */
		newAssetTransaction: PropTypes.func
	};

	static navigationOptions = ({ navigation }) =>
		getNetworkNavbarOptions(navigation.getParam('contractName', ''), false, navigation);

	onSend = async () => {
		const {
			navigation: {
				state: { params }
			}
		} = this.props;
		this.props.newAssetTransaction(params);
		this.props.navigation.navigate('SendFlowView');
	};

	render() {
		const {
			navigation: {
				state: { params }
			},
			navigation
		} = this.props;
		const collectible = params;
		const lowerAddress = collectible.address.toLowerCase();
		const tradable =
			lowerAddress in collectiblesTransferInformation
				? collectiblesTransferInformation[lowerAddress].tradable
				: true;

		return (
			<SafeAreaView style={styles.root}>
				<ScrollView style={styles.wrapper} ref={this.scrollViewRef}>
					<View style={styles.assetOverviewWrapper} testID={'asset'}>
						<CollectibleOverview
							navigation={navigation}
							collectible={collectible}
							tradable={tradable}
							onSend={this.onSend}
						/>
					</View>
				</ScrollView>
			</SafeAreaView>
		);
	}
}

const mapDispatchToProps = dispatch => ({
	newAssetTransaction: selectedAsset => dispatch(newAssetTransaction(selectedAsset))
});

export default connect(
	null,
	mapDispatchToProps
)(CollectibleView);
