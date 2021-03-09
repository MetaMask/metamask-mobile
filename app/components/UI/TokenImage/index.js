import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import AssetIcon from '../AssetIcon';
import Identicon from '../Identicon';
import contractMap from '@metamask/contract-metadata';
import { toChecksumAddress } from 'ethereumjs-util';
import { connect } from 'react-redux';

const styles = StyleSheet.create({
	itemLogoWrapper: {
		width: 50,
		height: 50
	},
	roundImage: {
		overflow: 'hidden',
		borderRadius: 25
	}
});

export function TokenImage({ asset, containerStyle, iconStyle, logoDefined, swapsTokens }) {
	const completeAsset = useMemo(() => {
		if (!logoDefined && !asset.logo) {
			const checksumAddress = toChecksumAddress(asset.address);
			if (checksumAddress in contractMap) {
				asset.logo = contractMap[checksumAddress].logo;
			} else {
				const swapAsset = swapsTokens?.find(({ address }) => asset.address.toLowerCase() === address);
				asset.image = swapAsset?.iconUrl;
			}
		}
		return asset;
	}, [asset, logoDefined, swapsTokens]);

	return (
		<View style={[styles.itemLogoWrapper, containerStyle, asset.logo || asset.image ? {} : styles.roundImage]}>
			{asset.logo || asset.image ? (
				<AssetIcon
					watchedAsset={asset.image !== undefined}
					logo={completeAsset.image || completeAsset.logo}
					customStyle={iconStyle}
				/>
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
	logoDefined: PropTypes.bool,
	swapsTokens: PropTypes.arrayOf(PropTypes.object)
};

const mapStateToProps = state => ({
	swapsTokens: state.engine.backgroundState.SwapsController.tokens
});

export default connect(mapStateToProps)(TokenImage);
