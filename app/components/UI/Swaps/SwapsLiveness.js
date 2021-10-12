import { swapsUtils } from '@metamask/swaps-controller';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { connect } from 'react-redux';
import AppConstants from '../../../core/AppConstants';
import { setSwapsLiveness, swapsLivenessSelector } from '../../../reducers/swaps';
import Logger from '../../../util/Logger';
import useInterval from '../../hooks/useInterval';
import { isSwapsAllowed } from './utils';

const POLLING_FREQUENCY = AppConstants.SWAPS.LIVENESS_POLLING_FREQUENCY;

function SwapLiveness({ isLive, chainId, setLiveness }) {
	const [hasMountChecked, setHasMountChecked] = useState(false);

	const checkLiveness = useCallback(async () => {
		try {
			const data = await swapsUtils.fetchSwapsFeatureLiveness(chainId, AppConstants.SWAPS.CLIENT_ID);
			const liveness = typeof data === 'boolean' ? data : data?.mobile_active ?? false;
			setLiveness(liveness, chainId);
		} catch (error) {
			Logger.error(error, 'Swaps: error while fetching swaps liveness');
			setLiveness(false, chainId);
		}
	}, [setLiveness, chainId]);

	// Check on mount
	useEffect(() => {
		if (isSwapsAllowed(chainId) && !isLive && !hasMountChecked) {
			setHasMountChecked(true);
			checkLiveness();
		}
	}, [chainId, checkLiveness, hasMountChecked, isLive]);

	// Check con appstate change
	const appStateHandler = useCallback(
		(newState) => {
			if (hasMountChecked && !isLive && newState === 'active') {
				checkLiveness();
			}
		},
		[checkLiveness, hasMountChecked, isLive]
	);

	useEffect(() => {
		if (isSwapsAllowed(chainId)) {
			AppState.addEventListener('change', appStateHandler);
			return () => {
				AppState.removeEventListener('change', appStateHandler);
			};
		}
	}, [appStateHandler, chainId]);

	// Check on interval
	useInterval(
		async () => {
			checkLiveness();
		},
		isSwapsAllowed(chainId) && !isLive ? POLLING_FREQUENCY : null
	);

	return null;
}

const mapStateToProps = (state) => ({
	isLive: swapsLivenessSelector(state),
	chainId: state.engine.backgroundState.NetworkController.provider.chainId,
});

const mapDispatchToProps = (dispatch) => ({
	setLiveness: (liveness, chainId) => dispatch(setSwapsLiveness(liveness, chainId)),
});

export default connect(mapStateToProps, mapDispatchToProps)(SwapLiveness);
