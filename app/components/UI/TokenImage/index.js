import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import AssetIcon from '../AssetIcon';
import Identicon from '../Identicon';
import isUrl from 'is-url';
import { connect } from 'react-redux';
import { selectTokenList } from '../../../selectors/tokenListController';

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

const TokenImage = ({ asset, containerStyle, iconStyle, tokenList }) => {
  const assetImage = isUrl(asset?.image) ? asset.image : null;
  const iconUrl =
    assetImage ||
    tokenList[asset?.address]?.iconUrl ||
    tokenList[asset?.address?.toLowerCase()]?.iconUrl ||
    '';

  return (
    <View style={[styles.itemLogoWrapper, containerStyle, styles.roundImage]}>
      {iconUrl ? (
        <AssetIcon
          address={asset?.address}
          logo={iconUrl}
          customStyle={iconStyle}
        />
      ) : (
        <Identicon address={asset?.address} customStyle={iconStyle} />
      )}
    </View>
  );
};

TokenImage.propTypes = {
  asset: PropTypes.object,
  containerStyle: PropTypes.object,
  iconStyle: PropTypes.object,
  tokenList: PropTypes.object,
};

const mapStateToProps = (state) => ({
  tokenList: selectTokenList(state),
});

export default connect(mapStateToProps)(TokenImage);
