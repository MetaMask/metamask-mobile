import { swapsUtils } from '@estebanmino/controllers';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { connect } from 'react-redux';
import AppConstants from '../../../core/AppConstants';
import { setSwapsLiveness, swapsLivenessSelector } from '../../../reducers/swaps';
import useInterval from '../../hooks/useInterval';

const POLLING_FREQUENCY = AppConstants.SWAPS.LIVENESS_POLLING_FREQUENCY;

function SwapLiveness({ isLive, setLiveness }) {
	const [hasMountChecked, setHasMountChecked] = useState(false);

	const checkLiveness = useCallback(async () => {
		try {
			const liveness = await swapsUtils.fetchSwapsFeatureLiveness();
			setLiveness(liveness);
		} catch (err) {
			console.error(err);
			setLiveness(false);
		}
	}, [setLiveness]);

	// Check on mount
	useEffect(() => {
		if (!isLive && !hasMountChecked) {
			setHasMountChecked(true);
			checkLiveness();
		}
	}, [checkLiveness, hasMountChecked, isLive]);

	// Check con appstate change
	const appStateHandler = useCallback(
		newState => {
			if (hasMountChecked && !isLive && newState === 'active') {
				checkLiveness();
			}
		},
		[checkLiveness, hasMountChecked, isLive]
	);

	useEffect(() => {
		AppState.addEventListener('change', appStateHandler);
		return () => {
			AppState.removeEventListener('change', appStateHandler);
		};
	}, [appStateHandler]);

	// Check on interval
	useInterval(
		async () => {
			checkLiveness();
		},
		isLive ? null : POLLING_FREQUENCY
	);

	return null;
}

const mapStateToProps = state => ({
	isLive: swapsLivenessSelector(state)
});

const mapDispatchToProps = dispatch => ({
	setLiveness: live => dispatch(setSwapsLiveness(live))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(SwapLiveness);
