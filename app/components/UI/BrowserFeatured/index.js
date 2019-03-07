import React, { Component } from 'react';
import dappList from '../../../util/featured-dapp-list';
import FeaturedItem from './FeaturedItem';
import PropTypes from 'prop-types';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { colors } from '../../../styles/common';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white
	}
});

/**
 * Browser features dapps
 */
export default class BrowserFeatured extends Component {
	static propTypes = {
		/*
		 * Function to be called when tapping on a favorite item
		 */
		goTo: PropTypes.any
	};

	self = React.createRef();

	measureMyself(cb) {
		this.self && this.self.current && this.self.current.measure(cb);
	}

	renderItem = item => {
		const { name, description, url, imageUrl } = item;
		return (
			<TouchableOpacity
				key={url}
				onPress={() => this.props.goTo(url)} // eslint-disable-line react/jsx-no-bind
			>
				<FeaturedItem name={name} url={url} description={description} imageUrl={imageUrl} />
			</TouchableOpacity>
		);
	};
	render() {
		return (
			<View ref={this.self} style={styles.wrapper}>
				{dappList.map(item => this.renderItem(item))}
			</View>
		);
	}
}
