import React, { useEffect } from 'react';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { selectSearchedToken } from '../../../selectors/tokensController';
import { RootState } from '../../../reducers';
import { ActivityIndicator, Text, View } from 'react-native';
import Engine from '../../../core/Engine/Engine';
import Asset from '../Asset';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';

export interface AssetLoaderProps {
    route: {
        params: {
            address: string;
            chainId: Hex;
        }
    }
}

export const AssetLoader: React.FC<AssetLoaderProps> = ({ route: { params: { address, chainId } } }) => {
    const tokenResult = useSelector((state: RootState) => selectSearchedToken(state, chainId, address));

    const navigation = useNavigation();

    useEffect(() => {
        if (!tokenResult) {
            Engine.context.TokensController.addSearchedToken(address, chainId);
        } else if (tokenResult.found) {
            navigation.goBack();
            navigation.navigate(Routes.BROWSER.ASSET_VIEW, {
                ...tokenResult.token,
                chainId
            });
        }
    }, [tokenResult, address, chainId, navigation]);

    if (!tokenResult) {
        return (
            <View>
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

    return (
        <View />
    );
}