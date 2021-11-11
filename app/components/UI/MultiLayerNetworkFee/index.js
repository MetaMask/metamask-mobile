import React, { useState, useEffect } from 'react';
import Eth from 'ethjs';

import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';

import Logger from '../../../util/Logger';
import { fromWei, hexToBN } from '../../../util/number';
import Text from '../../Base/Text';
import fetchEstimatedL1Fee from '../../../util/optimism/fetchEstimatedL1Fee';

const styles = StyleSheet.create({
	layer1TotalContainer: {
		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: '100%',
	},
	layer1Containers: {
		display: 'flex',
		width: '100%',
	},
	gasFeeTitleContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
});

export default function MultiLayerNetworkFee({ transaction, ticker }) {
	const {
		transaction: { gas, gasPrice, value },
	} = transaction;
	const [fetchedLayer1Total, setLayer1Total] = useState(null);

	const layer2fee = gas ? gas.mul(gasPrice).toString(16) : '0x0';

	let layer1Total = 'unknown';

	if (fetchedLayer1Total !== null) {
		layer1Total = `${fromWei(hexToBN(fetchedLayer1Total))} ${ticker}`;
	}

	const weiTotal = hexToBN(layer2fee)
		.add(hexToBN(fetchedLayer1Total || '0x0'))
		.add(hexToBN(value || '0x0'));
	const totalInEth = `${fromWei(weiTotal)} ${ticker}`;

	useEffect(() => {
		const getEstimatedL1Fee = async () => {
			try {
				const eth = new Eth(Engine.context.NetworkController.provider);
				const result = await fetchEstimatedL1Fee(eth, transaction);
				setLayer1Total(result);
			} catch (e) {
				Logger.error(e);
				setLayer1Total(null);
			}
		};
		getEstimatedL1Fee();
	}, [transaction]);

	return (
		<View style={styles.layer1Containers}>
			<View style={styles.layer1TotalContainer}>
				<View>
					<View style={styles.gasFeeTitleContainer}>
						<Text primary bold>
							{strings('transactions.layer_1_fees')}
						</Text>
					</View>
				</View>
				<View>
					<View>
						<Text primary bold upper right>
							{layer1Total}
						</Text>
					</View>
				</View>
			</View>
			<View style={styles.layer1TotalContainer}>
				<View>
					<View style={styles.gasFeeTitleContainer}>
						<Text primary bold>
							{strings('transaction.total')}
						</Text>
					</View>
				</View>
				<View>
					<View>
						<Text primary bold upper right>
							{totalInEth}
						</Text>
					</View>
				</View>
			</View>
		</View>
	);
}

MultiLayerNetworkFee.propTypes = {
	transaction: PropTypes.object,
	ticker: PropTypes.string,
};
