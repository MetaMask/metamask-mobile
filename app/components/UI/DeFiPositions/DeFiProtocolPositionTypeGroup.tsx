import React, { Fragment } from 'react';
import { ImageSourcePropType } from 'react-native';
import { GroupedDeFiPositions } from '@metamask/assets-controllers';
import Summary from '../../Base/Summary';
import DeFiProtocolPositionGroupTokens from './DeFiProtocolPositionGroupTokens';
import { PositionType } from './position-types';

interface DeFiProtocolPositionTypeGroupProps {
  positionType: PositionType;
  positionGroups: NonNullable<
    GroupedDeFiPositions['protocols'][number]['positionTypes'][PositionType]
  >;
  networkIconAvatar: ImageSourcePropType | undefined;
  privacyMode: boolean;
}

const DeFiProtocolPositionTypeGroup = ({
  positionType,
  positionGroups,
  networkIconAvatar,
  privacyMode,
}: DeFiProtocolPositionTypeGroupProps) => {
  const formatedGroups = positionGroups.positions.flatMap((tokenGroup) =>
    tokenGroup.map((protocolToken) => ({
      key: `${protocolToken.address}`,
      underlyings: protocolToken.tokens
        .filter((underlyingToken) => underlyingToken.type === 'underlying')
        .map((underlyingToken) => ({
          name: underlyingToken.name,
          symbol: underlyingToken.symbol,
          iconUrl: underlyingToken.iconUrl,
          balance: underlyingToken.balance,
          marketValue: underlyingToken.marketValue,
        })),
      underlyingRewards: protocolToken.tokens
        .filter(
          (underlyingToken) => underlyingToken.type === 'underlying-claimable',
        )
        .map((underlyingToken) => ({
          name: underlyingToken.name,
          symbol: underlyingToken.symbol,
          iconUrl: underlyingToken.iconUrl,
          balance: underlyingToken.balance,
          marketValue: underlyingToken.marketValue,
        })),
    })),
  );

  return (
    <>
      {formatedGroups.map((position, i, positions) => {
        const isLast = i === positions.length - 1;
        return (
          <Fragment key={position.key}>
            <DeFiProtocolPositionGroupTokens
              positionType={positionType}
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
    </>
  );
};

export default DeFiProtocolPositionTypeGroup;
