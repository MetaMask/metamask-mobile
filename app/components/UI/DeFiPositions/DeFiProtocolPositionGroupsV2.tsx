import React, { Fragment, useMemo } from 'react';
import { FlatList, ImageSourcePropType, View } from 'react-native';
import type { DeFiProtocolPositionGroup } from '@metamask/assets-controllers';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import styleSheet from './DeFiProtocolPositionGroups.styles';
import DeFiProtocolPositionGroupTokens from './DeFiProtocolPositionGroupTokens';
import Summary from '../../Base/Summary';
import { useStyles } from '../../hooks/useStyles';
import { mapDefiProtocolDetailsPositionV2ToToken } from './utils/map-defi-protocol-details-position-v2';

interface DeFiProtocolPositionGroupsV2Props {
  protocolPositionGroup: DeFiProtocolPositionGroup;
  networkIconAvatar: ImageSourcePropType | undefined;
  privacyMode: boolean;
}

const DeFiProtocolPositionGroupsV2: React.FC<
  DeFiProtocolPositionGroupsV2Props
> = ({ protocolPositionGroup, networkIconAvatar, privacyMode }) => {
  const { styles } = useStyles(styleSheet, undefined);

  const sections = useMemo(
    () =>
      protocolPositionGroup.sections.map((section) => ({
        productName: section.productName,
        tokens: section.positions.map((position) =>
          mapDefiProtocolDetailsPositionV2ToToken(position),
        ),
      })),
    [protocolPositionGroup.sections],
  );

  return (
    <View style={styles.protocolDetailsPositionsWrapper}>
      <FlatList
        data={sections}
        renderItem={({ item: section, index }) => {
          const isLast = index === sections.length - 1;
          return (
            <Fragment key={section.productName}>
              <Text
                variant={TextVariant.BodyMDMedium}
                color={TextColor.Alternative}
              >
                {section.productName}
              </Text>
              <DeFiProtocolPositionGroupTokens
                positionType="supply"
                hidePositionTypeLabel
                tokens={section.tokens}
                networkIconAvatar={networkIconAvatar}
                privacyMode={privacyMode}
              />
              {!isLast && <Summary.Separator />}
            </Fragment>
          );
        }}
        keyExtractor={(section) => section.productName}
      />
    </View>
  );
};

export default DeFiProtocolPositionGroupsV2;
