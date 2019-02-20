import React, { Component } from 'react';
import dappList from '../../../../util/featured-dapp-list';
import FavoriteItem from './FavoriteItem';
import PropTypes from 'prop-types';
import { TouchableOpacity, FlatList, StyleSheet, View } from 'react-native';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		minHeight: 500
	}
});

/**
 * Favourites
 */
export default class BrowserFeatured extends Component {
	static propTypes = {
		/*
		 * Function to be called when tapping on a bookmark item
		 */
		goTo: PropTypes.any
	};

	renderItem = ({ item }) => {
		const { name, description, url } = item;
		return (
			<TouchableOpacity
				key={url}
				onPress={() => this.props.goTo(url)} // eslint-disable-line react/jsx-no-bind
			>
				<FavoriteItem name={name} url={url} description={description} />
			</TouchableOpacity>
		);
	};
	render() {
		return (
			<View style={styles.wrapper}>
				<FlatList data={dappList} renderItem={this.renderItem} />
			</View>
		);
	}
}
