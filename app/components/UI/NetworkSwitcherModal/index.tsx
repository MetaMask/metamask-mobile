import { useNavigation } from '@react-navigation/core';
import React, { useRef } from 'react';
import ReusableModal, { ReusableModalRef } from '../ReusableModal';
import NetworkList from '../NetworkList';

const NetworkSwitcherModal = () => {
	const navigation = useNavigation();
	const modalRef = useRef<ReusableModalRef>(null);

	const dismissModal = (cb?: () => void) => modalRef?.current?.dismissModal(cb);

	const triggerInvalidNetworkModal = (network: any) => {
		dismissModal(() => navigation.navigate('InvalidNetworkModal', { params: { invalidCustomNetwork: network } }));
	};

	return (
		<ReusableModal ref={modalRef} style={{ justifyContent: 'center', paddingHorizontal: 24 }}>
			<NetworkList onClose={dismissModal} showInvalidCustomNetworkAlert={triggerInvalidNetworkModal} />
		</ReusableModal>
	);
};

export default NetworkSwitcherModal;
