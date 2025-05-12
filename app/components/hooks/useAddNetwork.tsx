import React, { useState } from 'react';
import { PopularList } from '../../util/networks/customNetworks';
import { noop } from 'lodash';
import NetworkModals from '../UI/NetworkModal';
import { useNavigation } from '@react-navigation/native';
type PopularNetwork = typeof PopularList[number];

export const useAddNetwork = () => {
    const [popularNetwork, setPopularNetwork] = useState<PopularNetwork | null>(null);
    const [resolveAddNetwork, setResolveAddNetwork] = useState<() => void>(noop);
    const [rejectAddNetwork, setRejectAddNetwork] = useState<() => void>(noop);
    const navigation = useNavigation();

    const addPopularNetwork = (network: PopularNetwork) => new Promise<void>((resolve, reject) => {
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
