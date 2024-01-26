import React from 'react';
import PropTypes from 'prop-types';
import {
  NetworkId,
  NetworksTicker,
  convertHexToDecimal,
} from '@metamask/controller-utils';
import { connect } from 'react-redux';
import {
  selectChainId,
  selectTicker,
} from '../../../selectors/networkController';

import AvatarNetwork, {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';

function NetworkMainAssetLogo({ chainId, ticker, style }) {
  if (ticker === NetworksTicker.mainnet) {
    return (
      <AvatarNetwork
        variant={AvatarVariant.Network}
        size={AvatarSize.Xs}
        chainId={NetworkId.mainnet}
        name={ticker}
        style={style}
      />
    );
  }
  return (
    <AvatarNetwork
      variant={AvatarVariant.Network}
      size={AvatarSize.Xs}
      chainId={convertHexToDecimal(chainId).toString()}
      name={ticker}
      style={style}
    />
  );
}

const mapStateToProps = (state) => ({
  chainId: selectChainId(state),
  ticker: selectTicker(state),
});

NetworkMainAssetLogo.propTypes = {
  chainId: PropTypes.string,
  ticker: PropTypes.string,
  style: PropTypes.object,
};

export default connect(mapStateToProps)(NetworkMainAssetLogo);
