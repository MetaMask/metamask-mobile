import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ActivityIndicator, InteractionManager, RefreshControl, StyleSheet, Text, View, FlatList } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import TransactionElement from '../TransactionElement';
import Engine from '../../core/Engine';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	emptyView: {
		paddingTop: 80,
		alignItems: 'center',
		backgroundColor: colors.white,
		flex: 1
	},
	text: {
		fontSize: 20,
		color: colors.fontTertiary,
		...fontStyles.normal
	},
	loader: {
		minHeight: 250,
		backgroundColor: colors.white,
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	}
});

/**
 * View that renders a list of transactions for a specific asset
 */
export default class Transactions extends Component {
	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object,
		/**
		 * An array of transactions objects
		 */
		transactions: PropTypes.array,
		/**
		 * Callback function that will adjust the scroll
		 * position once the transaction detail is visible
		 */
		adjustScroll: PropTypes.func,
		/**
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string
	};

	state = {
		selectedTx: null,
		ready: false,
		refreshing: false
	};

	componentDidMount() {
		this.mounted = true;
		InteractionManager.runAfterInteractions(() => {
			this.mounted && this.setState({ ready: true });
		});
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	toggleDetailsView = (hash, index) => {
		const show = this.state.selectedTx !== hash;

		this.setState({ selectedTx: show ? hash : null });
		if (show) {
			this.props.adjustScroll && this.props.adjustScroll(index);
		}
	};

	onRefresh = async () => {
		this.setState({ refreshing: true });
		await Engine.refreshTransactionHistory();
		this.setState({ refreshing: false });
	};

	renderLoader = () => (
		<View style={styles.loader}>
			<ActivityIndicator size="small" />
		</View>
	);

	renderEmpty = () => (
		<View style={styles.emptyView}>
			<Text style={styles.text}>{strings('wallet.no_transactions')}</Text>
		</View>
	);

	keyExtractor = item => item.id;

	renderContent() {
		if (!this.state.ready) {
			return this.renderLoader();
		}

		const { selectedAddress, transactions, navigation } = this.props;

		if (!transactions.length) {
			return this.renderEmpty();
		}
		return (
			<FlatList
				data={transactions}
				extraData={this.state}
				keyExtractor={this.keyExtractor}
				refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={this.onRefresh} />}
				// eslint-disable-next-line react/jsx-no-bind
				renderItem={({ item, index }) => (
					<TransactionElement
						tx={item}
						i={index}
						selectedAddress={selectedAddress}
						selected={this.state.selectedTx === item.transactionHash}
						toggleDetailsView={this.toggleDetailsView}
						navigation={navigation}
					/>
				)}
			/>
		);
	}

	render = () => (
		<View style={styles.wrapper}>
			<View testID={'transactions'}>{this.renderContent()}</View>
		</View>
	);
}
