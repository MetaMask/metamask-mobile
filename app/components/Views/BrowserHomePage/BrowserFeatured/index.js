import React, { Component } from 'react';
import dappList from '../../../../util/featured-dapp-list';
import FavoriteItem from './FavoriteItem';
import { ScrollView } from 'react-native-gesture-handler';

/**
 * Favourites
 */
export default class BrowserFeatured extends Component {
	render() {
		return (
			<ScrollView>
				{dappList.map(({ name, url, description }) => (
					<FavoriteItem key={url} name={name} url={url} description={description} />
				))}
			</ScrollView>
		);
	}
}
