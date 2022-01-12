import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import AssetIcon from '../AssetIcon';
import Identicon from '../Identicon';
import { connect } from 'react-redux';
import { getTokenList } from '../../../reducers/tokens';

const styles = StyleSheet.create({
	itemLogoWrapper: {
		width: 50,
		height: 50,
	},
	roundImage: {
		overflow: 'hidden',
		borderRadius: 25,
	},
});

export function TokenImage({ asset, containerStyle, iconStyle, tokenList }) {
	const iconUrl = tokenList[asset?.address]?.iconUrl || tokenList[asset?.address?.toLowerCase()]?.iconUrl || '';

	return (
		<View style={[styles.itemLogoWrapper, containerStyle, styles.roundImage]}>
			{iconUrl ? (
				<AssetIcon logo={iconUrl} customStyle={iconStyle} />
			) : (
				<Identicon address={asset.address} customStyle={iconStyle} />
			)}
		</View>
	);
}

TokenImage.propTypes = {
	asset: PropTypes.object,
	containerStyle: PropTypes.object,
	iconStyle: PropTypes.object,
	tokenList: PropTypes.object,
};

const mapStateToProps = (state) => ({
	tokenList: getTokenList(state),
});

export default connect(mapStateToProps)(TokenImage);
