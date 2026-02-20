import React, { useCallback, useState, useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { useAddPopularNetwork } from '../../hooks/useAddPopularNetwork';
import { PopularList } from '../../../util/networks/customNetworks';

import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import Cell, {
  CellVariant,
} from '../../../component-library/components/Cells/Cell';
import { AvatarVariant } from '../../../component-library/components/Avatars/Avatar';
import TextFieldSearch from '../../../component-library/components/Form/TextFieldSearch/TextFieldSearch';

import { useNetworkManagementData } from './hooks/useNetworkManagementData';
import { NetworksManagementViewSelectorsIDs } from './NetworksManagementView.testIds';
import { SECTION_KEYS } from './NetworksManagementView.constants';
import { NetworkManagementItem } from './NetworksManagementView.types';

import AdditionalNetworkItem from './components/AdditionalNetworkItem';

const NetworksManagementView = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const { addPopularNetwork } = useAddPopularNetwork();

  const [searchQuery, setSearchQuery] = useState('');

  const { sections } = useNetworkManagementData({ searchQuery });

  const { enabledNetworks, testNetworks, availableNetworks } = useMemo(() => {
    const findSection = (key: string) =>
      sections.find((s) => s.key === key)?.data ?? [];

    return {
      enabledNetworks: findSection(SECTION_KEYS.ADDED_MAINNETS),
      testNetworks: findSection(SECTION_KEYS.ADDED_TESTNETS),
      availableNetworks: findSection(SECTION_KEYS.AVAILABLE_NETWORKS),
    };
  }, [sections]);

  const hasNoResults =
    searchQuery.length > 0 &&
    sections.every((section) => section.data.length === 0);

  // Navigation handlers
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleAddCustomNetwork = useCallback(() => {
    navigation.navigate(Routes.SETTINGS.NETWORK_DETAILS, {
      shouldNetworkSwitchPopToWallet: false,
    });
  }, [navigation]);

  const handleAddNetwork = useCallback(
    (chainId: string) => {
      const popularNetwork = PopularList.find((p) => p.chainId === chainId);
      if (popularNetwork) {
        addPopularNetwork(popularNetwork, false);
      }
    },
    [addPopularNetwork],
  );

  const handleEditNetwork = useCallback(
    (rpcUrl: string) => {
      navigation.navigate(Routes.SETTINGS.NETWORK_DETAILS, {
        shouldNetworkSwitchPopToWallet: false,
        network: rpcUrl,
      });
    },
    [navigation],
  );

  const renderNetworkCell = useCallback(
    (item: NetworkManagementItem) => (
      <Cell
        key={item.chainId}
        variant={CellVariant.SelectWithMenu}
        title={item.name}
        secondaryText={
          item.hasMultipleRpcs && item.rpcUrl ? item.rpcUrl : undefined
        }
        avatarProps={{
          variant: AvatarVariant.Network,
          name: item.name,
          imageSource: item.imageSource,
        }}
        onPress={() => handleEditNetwork(item.rpcUrl ?? '')}
        showButtonIcon={false}
        testID={NetworksManagementViewSelectorsIDs.NETWORK_ITEM(item.chainId)}
      />
    ),
    [handleEditNetwork],
  );

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-background-default')}
      testID={NetworksManagementViewSelectorsIDs.CONTAINER}
    >
      <HeaderCompactStandard
        title={strings('app_settings.networks_title')}
        onBack={handleBack}
        includesTopInset
      />

      <Box twClassName="px-4 py-2">
        <TextFieldSearch
          value={searchQuery}
          onChangeText={setSearchQuery}
          onPressClearButton={() => setSearchQuery('')}
          placeholder={strings('app_settings.networks_search_placeholder')}
          testID={NetworksManagementViewSelectorsIDs.SEARCH_INPUT}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </Box>

      <ScrollView
        style={tw.style('flex-1')}
        testID={NetworksManagementViewSelectorsIDs.SECTION_LIST}
      >
        {/* Empty state */}
        {hasNoResults && (
          <Box
            twClassName="flex-1 items-center justify-center py-8"
            testID={NetworksManagementViewSelectorsIDs.EMPTY_STATE}
          >
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('app_settings.networks_no_results')}
            </Text>
          </Box>
        )}

        {/* Enabled Networks section */}
        {enabledNetworks.length > 0 && (
          <>
            <Box twClassName="flex-row items-center justify-between px-4 my-4">
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                {strings('app_settings.networks_enabled')}
              </Text>
            </Box>
            {enabledNetworks.map(renderNetworkCell)}
          </>
        )}

        {/* Additional Networks section */}
        <Box twClassName="flex-row items-center justify-between px-4 my-4">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {strings('app_settings.networks_additional')}
          </Text>
        </Box>
        {availableNetworks.map((item) => (
          <AdditionalNetworkItem
            key={item.chainId}
            item={item}
            onAdd={handleAddNetwork}
          />
        ))}

        {/* Test Networks section */}
        {testNetworks.length > 0 && (
          <>
            <Box twClassName="flex-row items-center justify-between px-4 my-4">
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                {strings('app_settings.networks_test_networks')}
              </Text>
            </Box>
            {testNetworks.map(renderNetworkCell)}
          </>
        )}
      </ScrollView>

      {/* Sticky footer — Add network button */}
      <Box twClassName="py-1 px-4">
        <Button
          variant={ButtonVariants.Secondary}
          label={strings('app_settings.network_add_network')}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          onPress={handleAddCustomNetwork}
          testID={NetworksManagementViewSelectorsIDs.ADD_CUSTOM_NETWORK_BUTTON}
        />
      </Box>
    </SafeAreaView>
  );
};

export default NetworksManagementView;
