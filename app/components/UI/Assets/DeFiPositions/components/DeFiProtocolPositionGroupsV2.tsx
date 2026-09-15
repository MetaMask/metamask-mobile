import React, { useCallback, useMemo } from 'react';
import { ImageSourcePropType, View } from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useSelector } from 'react-redux';
import type { DeFiProtocolPositionGroup } from '@metamask/assets-controllers';
import {
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { getSelectedCurrency } from '../../../../../selectors/assets/assets-controller';
import styleSheet from '../../../DeFiPositions/DeFiProtocolPositionGroups.styles';
import DeFiProtocolPositionGroupTokens from '../../../DeFiPositions/DeFiProtocolPositionGroupTokens';
import Summary from '../../../../Base/Summary';
import { useStyles } from '../../../../hooks/useStyles';
import {
  flattenDefiProtocolPositionGroupSections,
  type DeFiProtocolPositionGroupListItem,
} from '../utils/flatten-defi-protocol-position-group-sections';

interface DeFiProtocolPositionGroupsV2Props {
  protocolPositionGroup: DeFiProtocolPositionGroup;
  networkIconAvatar: ImageSourcePropType | undefined;
  privacyMode: boolean;
}

const DeFiProtocolPositionGroupsV2: React.FC<
  DeFiProtocolPositionGroupsV2Props
> = ({ protocolPositionGroup, networkIconAvatar, privacyMode }) => {
  const { styles } = useStyles(styleSheet, undefined);
  const currency = useSelector(getSelectedCurrency);

  const listItems = useMemo(
    () =>
      flattenDefiProtocolPositionGroupSections(protocolPositionGroup.sections),
    [protocolPositionGroup.sections],
  );

  const renderItem = useCallback<
    ListRenderItem<DeFiProtocolPositionGroupListItem>
  >(
    ({ item }) => {
      if (item.type === 'header') {
        return (
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {item.productName}
          </Text>
        );
      }

      if (item.type === 'separator') {
        return <Summary.Separator />;
      }

      return (
        <DeFiProtocolPositionGroupTokens
          tokens={[item.token]}
          networkIconAvatar={networkIconAvatar}
          privacyMode={privacyMode}
          currency={currency}
        />
      );
    },
    [currency, networkIconAvatar, privacyMode],
  );

  return (
    <View style={styles.protocolDetailsPositionsWrapper}>
      <FlashList
        data={listItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        getItemType={(item) => item.type}
      />
    </View>
  );
};

export default DeFiProtocolPositionGroupsV2;
