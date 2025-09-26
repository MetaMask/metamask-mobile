import React from 'react';
import PropTypes from 'prop-types';
import { ChainId } from '@metamask/controller-utils';
import { connect } from 'react-redux';
import TokenIcon from '../Swaps/components/TokenIcon';
import {
  selectChainId,
  selectEvmTicker,
} from '../../../selectors/networkController';

function NetworkMainAssetLogo({
  chainId,
  ticker,
  style,
  big,
  biggest,
  testID,
}) {
  if (chainId === ChainId.mainnet) {
    return (
      <TokenIcon
        big={big}
        biggest={biggest}
        symbol={'ETH'}
        style={style}
        testID={testID}
      />
    );
  }
  return (
    <TokenIcon
      big={big}
      biggest={biggest}
      symbol={ticker}
      style={style}
      testID={testID}
    />
  );
}

const mapStateToProps = (state) => ({
  chainId: selectChainId(state),
  ticker: selectEvmTicker(state),
});

NetworkMainAssetLogo.propTypes = {
  chainId: PropTypes.string,
  ticker: PropTypes.string,
  style: PropTypes.object,
  big: PropTypes.bool,
  biggest: PropTypes.bool,
  testID: PropTypes.string,
};

export default connect(mapStateToProps)(NetworkMainAssetLogo);
