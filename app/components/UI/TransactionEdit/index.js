import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { toBN, isBN, fromWei } from '../../../util/number';
import CustomGas from '../CustomGas';
import { addHexPrefix } from 'ethereumjs-util';
import { getNormalizedTxState } from '../../../util/transactions';

/**
 * PureComponent that supports editing and reviewing a transaction
 */
class TransactionEdit extends PureComponent {
	static propTypes = {
		/**
		 * Called when a user changes modes
		 */
		onModeChange: PropTypes.func,
		/**
		 * Transaction object associated with this transaction,
		 */
		transaction: PropTypes.object.isRequired,
		/**
		 * Callback to update amount in parent state
		 */
		handleUpdateAmount: PropTypes.func,
		/**
		 * Callback to update gas and gasPrice in transaction in parent state
		 */
		handleGasFeeSelection: PropTypes.func,
		/**
		 * Callback to update data in transaction in parent state
		 */
		handleUpdateData: PropTypes.func,
		/**
		 * Callback to update readable value in transaction in parent state
		 */
		handleUpdateReadableValue: PropTypes.func,
		/**
		 * Callback to validate amount in transaction in parent state
		 */
		validateAmount: PropTypes.func,
		/**
		 * Callback to validate gas in transaction in parent state
		 */
		validateGas: PropTypes.func,
		/**
		 * Callback to validate to address in transaction in parent state
		 */
		validateToAddress: PropTypes.func,
		/**
		 * Object containing basic gas estimates
		 */
		basicGasEstimates: PropTypes.object
	};

	state = {
		toFocused: false,
		amountError: '',
		toAddressError: '',
		gasError: '',
		data: undefined
	};

	componentDidMount = () => {
		const { transaction } = this.props;
		if (transaction && transaction.value) {
			this.props.handleUpdateAmount(transaction.value, true);
		}
		if (transaction && transaction.assetType === 'ETH') {
			this.props.handleUpdateReadableValue(fromWei(transaction.value));
		}
		if (transaction && transaction.data) {
			this.setState({ data: transaction.data });
		}
	};

	componentDidUpdate = prevProps => {
		if (this.props.transaction.data !== prevProps.transaction.data) {
			this.updateData(this.props.transaction.data);
		}
	};

	review = async () => {
		const { onModeChange } = this.props;
		const { data } = this.state;
		await this.setState({ toFocused: true });
		const validated = !(await this.validate());
		if (validated) {
			if (data && data.substr(0, 2) !== '0x') {
				this.updateData(addHexPrefix(data));
			}
		}
		onModeChange && onModeChange('review');
	};

	validate = async () => {
		const amountError = await this.props.validateAmount(false);
		const gasError = this.props.validateGas();
		const toAddressError = this.props.validateToAddress();
		this.setState({ amountError, gasError, toAddressError });
		return amountError || gasError || toAddressError;
	};

	updateGas = async (gas, gasLimit) => {
		await this.props.handleGasFeeSelection(gas, gasLimit);
		const gasError = this.props.validateGas();
		this.setState({ gasError });
	};

	updateData = data => {
		this.setState({ data });
		this.props.handleUpdateData(data);
	};

	render() {
		const {
			transaction: { gas, gasPrice },
			basicGasEstimates
		} = this.props;
		const { gasError } = this.state;
		const totalGas = isBN(gas) && isBN(gasPrice) ? gas.mul(gasPrice) : toBN('0x0');
		return (
			<CustomGas
				handleGasFeeSelection={this.updateGas}
				basicGasEstimates={basicGasEstimates}
				totalGas={totalGas}
				gas={gas}
				gasPrice={gasPrice}
				gasError={gasError}
				review={this.review}
			/>
		);
	}
}

const mapStateToProps = state => ({
	transaction: getNormalizedTxState(state)
});

export default connect(mapStateToProps)(TransactionEdit);
