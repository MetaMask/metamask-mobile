import React, { useEffect } from 'react';
import { Hex } from '@metamask/utils';
import { ActivityIndicator, Text, View } from 'react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import Logger from '../../../util/Logger';
import Engine from '../../../core/Engine';
import { useSelector } from 'react-redux';
import { RootState } from '../../../reducers';
import { selectTokenDisplayData } from '../../../selectors/tokenSearchDiscoveryDataController';
export interface AssetLoaderProps {
    route: {
        params: {
            address: string;
            chainId: Hex;
        }
    }
}

export const AssetLoader: React.FC<AssetLoaderProps> = ({ route: { params: { address, chainId } } }) => {
    const tokenResult = useSelector((state: RootState) => selectTokenDisplayData(state, chainId, address));
    const navigation = useNavigation();

    useEffect(() => {
        Engine.context.TokenSearchDiscoveryDataController.fetchTokenDisplayData(chainId, address);
        if (tokenResult?.found) {
            navigation.dispatch(
                StackActions.replace(Routes.BROWSER.ASSET_VIEW, {
                    ...tokenResult.token,
                    chainId,
                    isFromSearch: true,
                })
            );
        }
    }, [tokenResult, address, chainId, navigation]);

    if (!tokenResult) {
        return (
            <View style={{flex: 1, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center'}}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (!tokenResult.found) {
        return (
            <View>
                <Text>Token not found</Text>
            </View>
        );
    }

    return null;
};
