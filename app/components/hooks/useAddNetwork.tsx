import React, { useState } from 'react';
import { noop } from 'lodash';
import NetworkModals, { NetworkConfigurationOptions } from '../UI/NetworkModal';
import { useNavigation } from '@react-navigation/native';

export const useAddNetwork = () => {
    const [popularNetwork, setPopularNetwork] = useState<NetworkConfigurationOptions | null>(null);
    const [resolveAddNetwork, setResolveAddNetwork] = useState<() => void>(noop);
    const [rejectAddNetwork, setRejectAddNetwork] = useState<() => void>(noop);
    const navigation = useNavigation();

    const addPopularNetwork = (network: NetworkConfigurationOptions) => new Promise<void>((resolve, reject) => {
        setResolveAddNetwork(() => resolve);
        setRejectAddNetwork(() => reject);
        setPopularNetwork(network);
    });

    const onCloseModal = () => {
        setPopularNetwork(null);
        setResolveAddNetwork(noop);
        setRejectAddNetwork(noop);
    };

    const networkModal = !popularNetwork ? null : (
         <NetworkModals
            isVisible
            navigation={navigation}
            onClose={onCloseModal}
            networkConfiguration={popularNetwork}
            showPopularNetworkModal
            shouldNetworkSwitchPopToWallet={false}
            autoSwitchNetwork
            onNetworkSwitch={noop}
            onAccept={resolveAddNetwork}
            onReject={rejectAddNetwork}
         />
    );

    return {
        addPopularNetwork,
        networkModal,
    };
};
