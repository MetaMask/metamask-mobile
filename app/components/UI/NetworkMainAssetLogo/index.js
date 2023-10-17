import React from 'react';
import PropTypes from 'prop-types';
import { NetworksChainId } from '@metamask/controller-utils';
import { connect } from 'react-redux';
import TokenIcon from '../Swaps/components/TokenIcon';
import {
  selectChainId,
  selectTicker,
} from '../../../selectors/networkController';

function NetworkMainAssetLogo({ chainId, ticker, style, big, biggest }) {
  if (chainId === NetworksChainId.mainnet) {
    return (
      <TokenIcon big={big} biggest={biggest} symbol={'ETH'} style={style} />
    );
  }
  return (
    <TokenIcon big={big} biggest={biggest} symbol={ticker} style={style} />
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
  big: PropTypes.bool,
  biggest: PropTypes.bool,
};

export default connect(mapStateToProps)(NetworkMainAssetLogo);
