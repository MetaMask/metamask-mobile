// third party dependencies
import { View, ScrollView, FlatList, ListRenderItem } from 'react-native';
import React, { useRef, useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';

// external dependencies
import { useStyles } from '../../../component-library/hooks/useStyles';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import ReusableModal, { ReusableModalRef } from '../ReusableModal';

import Routes from '../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../../util/navigation/navUtils';

// internal dependencies
import createStyles from './index.styles';
import { NetworkListModalSelectorsIDs } from '../../../../e2e/selectors/Network/NetworkListModal.selectors';
import { useTheme } from '../../../util/theme';

export const createNetworkManagerNavDetails = '';

const NetworkManager = () => {
  const sheetRef = useRef<ReusableModalRef>(null);

  const { colors } = useTheme();
  const { styles } = useStyles(createStyles, { colors });

  const mockData = useMemo(() => {
    // create large loop of data
    const data = [];
    for (let i = 0; i < 100; i++) {
      data.push({
        id: i,
        name: `Network Manager ${i}`,
        chainId: `0x${i.toString(16)}`,
        rpcUrl: `https://rpc.network.com/${i}`,
        nativeCurrency: {
          name: 'Network Currency',
          symbol: 'NC',
          decimals: 18,
        },
      });
    }
    return data;
  }, []);

  const renderItem: ListRenderItem<(typeof mockData)[0]> = ({ item }) => (
    <View>
      <Text>{item.name}</Text>
      <Text>{item.chainId}</Text>
      <Text>{item.rpcUrl}</Text>
    </View>
  );

  return (
    <ReusableModal ref={sheetRef} style={styles.screen}>
      <FlashList
        data={mockData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
      />
    </ReusableModal>
  );
};

export default NetworkManager;
