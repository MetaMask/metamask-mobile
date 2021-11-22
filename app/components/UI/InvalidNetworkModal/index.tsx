import React, { useRef } from 'react';
import { StyleSheet } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/core';
import ReusableModal, { ReusableModalRef } from '../ReusableModal';
import InvalidCustomNetworkAlert from '../InvalidCustomNetworkAlert';

type Route = {
	InvalidNetworkModal: {
		invalidCustomNetwork: any;
	};
};

type InvalidCustomNetworkModalRoute = RouteProp<Route, 'InvalidNetworkModal'>;

const InvalidNetworkModal = () => {
	const route = useRoute<InvalidCustomNetworkModalRoute>();
	const { invalidCustomNetwork } = route.params;
	const modalRef = useRef<ReusableModalRef>(null);

	const dismissModal = (cb?: () => void) => modalRef?.current?.dismissModal(cb);

	return (
		<ReusableModal ref={modalRef} style={styles.modal}>
			<InvalidCustomNetworkAlert
				network={invalidCustomNetwork}
				onClose={dismissModal}
				navigateTo={dismissModal}
			/>
		</ReusableModal>
	);
};

const styles = StyleSheet.create({
	modal: { justifyContent: 'center', paddingHorizontal: 24 },
});

export default InvalidNetworkModal;
