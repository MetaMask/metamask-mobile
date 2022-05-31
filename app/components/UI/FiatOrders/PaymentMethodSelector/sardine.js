import React from 'react';
import PropTypes from 'prop-types';
import { Image, StyleSheet } from 'react-native';
import { strings } from '../../../../../locales/i18n';

import PaymentMethod from '../components/PaymentMethod';
import Title from '../../../Base/Title';
import Text from '../../../Base/Text';

import Device from '../../../../util/device';
import { NETWORKS_CHAIN_ID } from '../../../../constants/on-ramp';
import { useAssetFromTheme } from '../../../../util/theme';

const styles = StyleSheet.create({
	title: {
		flex: 1,
		flexWrap: 'wrap',
	},
	logo: {
		marginVertical: 5,
		aspectRatio: 95 / 25,
		width: Device.isIphone5() ? 80 : 95,
		height: Device.isIphone5() ? 25 : 35,
		marginLeft: 5,
	},
});

// eslint-disable-next-line import/no-commonjs
const SardineLogoLightIcon = require('../../../../images/SardineLogo.svg');
const SardineLogoDarkIcon = require('../../../../images/SardineLogoDark.svg');
const SardineLogo = () => {
	const sardinePayLogoIcon = useAssetFromTheme(SardineLogoLightIcon, SardineLogoDarkIcon);
	return <Image source={sardinePayLogoIcon} style={styles.logo} />;
} 

const hasStablecoins = (chainId) =>
	[NETWORKS_CHAIN_ID.MAINNET, NETWORKS_CHAIN_ID.BSC, NETWORKS_CHAIN_ID.POLYGON, NETWORKS_CHAIN_ID.CELO].includes(
		chainId
	);

const SardinePaymentMethod = ({ onPress, ticker, chainId }) => (
	<PaymentMethod onPress={onPress}>
		<PaymentMethod.Content>
			<PaymentMethod.Details>
				<PaymentMethod.Title>
					<Title style={styles.title}>
						{hasStablecoins(chainId)
							? strings('fiat_on_ramp.buy_ticker_stablecoins', { ticker })
							: strings('fiat_on_ramp.buy_ticker', { ticker })}
					</Title>
					<SardineLogo />
				</PaymentMethod.Title>
				<Text bold>{strings('fiat_on_ramp.sardine_tagline')}</Text>
				<Text>{strings('fiat_on_ramp.sardine_features')}</Text>

				<PaymentMethod.InfoIconLine>
					<Text small>{strings('fiat_on_ramp.options_fees_vary')}</Text>
				</PaymentMethod.InfoIconLine>
			</PaymentMethod.Details>
		</PaymentMethod.Content>
	</PaymentMethod>
);

SardinePaymentMethod.propTypes = {
	onPress: PropTypes.func,
	ticker: PropTypes.string,
	chainId: PropTypes.string,
};
SardinePaymentMethod.defaultProps = {
	onPress: undefined,
};

export default SardinePaymentMethod;
