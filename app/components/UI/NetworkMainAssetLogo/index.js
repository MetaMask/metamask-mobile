import React from 'react';
import PropTypes from 'prop-types';
import { ChainId } from '@metamask/controller-utils';
import { connect } from 'react-redux';
import TokenIcon from '../../Base/TokenIcon';
import {
  selectChainId,
  selectEvmTicker,
} from '../../../selectors/networkController';

/**
 * react-redux 9 derives ownProps from the component's props type. Without an
 * annotation TS infers every destructured param as required `any`, so callers
 * that pass only `style` fail to typecheck. The propTypes below are all
 * optional; this mirrors them for TS.
 *
 * @param {object} props
 * @param {string} [props.chainId] - Supplied by `mapStateToProps`.
 * @param {string} [props.ticker] - Supplied by `mapStateToProps`.
 * @param {object} [props.style]
 * @param {boolean} [props.big]
 * @param {boolean} [props.biggest]
 * @param {string} [props.testID]
 */
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
