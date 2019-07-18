import React, { PureComponent } from 'react';
import dappList from '../../../util/featured-dapp-list';
import FeaturedItem from './FeaturedItem';
import PropTypes from 'prop-types';
import Button from '../Button';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../../styles/common';
import DeviceSize from '../../../util/DeviceSize';
import Analytics from '../../../core/Analytics';
import ANALYTICS_EVENT_OPTS from '../../../util/analytics';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white,
		paddingBottom: DeviceSize.isIphoneX() ? 30 : 20
	},
	button: {
		flex: 1,
		backgroundColor: colors.white,
		height: 120
	}
});

/**
 * Browser features dapps
 */
export default class BrowserFeatured extends PureComponent {
	static propTypes = {
		/*
		 * Function to be called when tapping on a favorite item
		 */
		goTo: PropTypes.any
	};

	self = React.createRef();

	onPress = url => {
		this.props.goTo(url);
		Analytics.trackEvent(ANALYTICS_EVENT_OPTS.BROWSER_FEATURED_APPS_OPEN);
	};

	measureMyself(cb) {
		this.self && this.self.current && this.self.current.measure(cb);
	}

	renderItem = item => {
		const { name, description, url, imageUrl } = item;
		return (
			<Button
				key={url}
				style={styles.button}
				onPress={() => this.onPress(url)} // eslint-disable-line react/jsx-no-bind
			>
				<FeaturedItem name={name} url={url} description={description} imageUrl={imageUrl} />
			</Button>
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
