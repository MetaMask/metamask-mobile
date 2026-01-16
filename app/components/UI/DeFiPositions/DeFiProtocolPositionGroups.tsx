import React, { Fragment, useMemo } from 'react';
import { ImageSourcePropType, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { PositionTypes } from './position-types';
import styleSheet from './DeFiProtocolPositionGroups.styles';
import { GroupedDeFiPositions } from '@metamask/assets-controllers';
import DeFiProtocolPositionGroupTokens from './DeFiProtocolPositionGroupTokens';
import Summary from '../../Base/Summary';
import { useStyles } from '../../hooks/useStyles';

interface DeFiProtocolPositionGroupsParams {
  protocolAggregate: GroupedDeFiPositions['protocols'][number];
  networkIconAvatar: ImageSourcePropType | undefined;
  privacyMode: boolean;
}

const DeFiProtocolPositionGroups: React.FC<
  DeFiProtocolPositionGroupsParams
> = ({
  protocolAggregate,
  networkIconAvatar,
  privacyMode,
}: DeFiProtocolPositionGroupsParams) => {
  const { styles } = useStyles(styleSheet, undefined);

  const positionGroups = useMemo(
    () =>
      PositionTypes.map((positionType) => {
        const protocolPositionsByType =
          protocolAggregate.positionTypes[positionType];

        if (!protocolPositionsByType) {
          return undefined;
        }

        return {
          positionType,
          positions: protocolPositionsByType.positions.flatMap((tokenGroup) =>
            tokenGroup.map((protocolToken) => ({
              protocolTokenAddress: `${protocolToken.address}`,
              underlyings: protocolToken.tokens
                .filter(
                  (underlyingToken) => underlyingToken.type === 'underlying',
                )
                .map((underlyingToken, index) => ({
                  key: `${protocolToken.address}-${underlyingToken.address}-${index}`,
                  address: underlyingToken.address,
                  name: underlyingToken.name,
                  symbol: underlyingToken.symbol,
                  iconUrl: underlyingToken.iconUrl,
                  balance: underlyingToken.balance,
                  marketValue: underlyingToken.marketValue,
                })),
              underlyingRewards: protocolToken.tokens
                .filter(
                  (underlyingToken) =>
                    underlyingToken.type === 'underlying-claimable',
                )
                .map((underlyingToken, index) => ({
                  key: `${protocolToken.address}-${underlyingToken.address}-${index}`,
                  address: underlyingToken.address,
                  name: underlyingToken.name,
                  symbol: underlyingToken.symbol,
                  iconUrl: underlyingToken.iconUrl,
                  balance: underlyingToken.balance,
                  marketValue: underlyingToken.marketValue,
                })),
            })),
          ),
        };
      }).filter(
        (group): group is NonNullable<typeof group> => group !== undefined,
      ),
    [protocolAggregate],
  );

  return (
    <View style={styles.protocolDetailsPositionsWrapper}>
      <FlatList
        data={positionGroups}
        renderItem={({ item: positionGroup }) => (
          <Fragment key={positionGroup.positionType}>
            {positionGroup.positions.map((position, index, positions) => {
              const isLast = index === positions.length - 1;
              return (
                <Fragment
                  key={`${positionGroup.positionType}-${position.protocolTokenAddress}`}
                >
                  <DeFiProtocolPositionGroupTokens
                    positionType={positionGroup.positionType}
                    tokens={position.underlyings}
                    networkIconAvatar={networkIconAvatar}
                    privacyMode={privacyMode}
                  />
                  <DeFiProtocolPositionGroupTokens
                    positionType={'reward'}
                    tokens={position.underlyingRewards}
                    networkIconAvatar={networkIconAvatar}
                    privacyMode={privacyMode}
                  />
                  {!isLast && <Summary.Separator />}
                </Fragment>
              );
            })}
          </Fragment>
        )}
        keyExtractor={(positionGroup) => `${positionGroup.positionType}`}
      />
    </View>
  );
};

export default DeFiProtocolPositionGroups;
