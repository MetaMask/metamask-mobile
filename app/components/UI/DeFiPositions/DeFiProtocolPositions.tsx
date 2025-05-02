import React, { Fragment, useEffect } from 'react';
import { ImageSourcePropType, View } from 'react-native';
import { useParams } from '../../../util/navigation/navUtils';
import { GroupedDeFiPositions } from '@metamask/assets-controllers';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../util/theme';
import { getDeFiProtocolPositionDetailsNavbarOptions } from '../Navbar';
import createStyles from './styles';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { formatWithThreshold } from '../../../util/assets';
import I18n, { strings } from '../../../../locales/i18n';
import Summary from '../../Base/Summary';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../component-library/components/Texts/SensitiveText';
import DeFiAvatarWithBadge from './DeFiAvatarWithBadge';

const PositionTypes = ['supply', 'stake', 'borrow', 'reward'] as const;
type PositionType = (typeof PositionTypes)[number];

const PositionGroupDetails = ({
  positionType,
  tokens,
  networkIconAvatar,
}: {
  positionType: PositionType;
  tokens: {
    name: string;
    symbol: string;
    iconUrl: string;
    balance: number;
    marketValue: number | undefined;
  }[];
  networkIconAvatar: ImageSourcePropType | undefined;
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  if (tokens.length === 0) {
    return null;
  }

  return (
    <View>
      <Text style={styles.PositionTypeLabel} variant={TextVariant.BodyMDMedium}>
        {strings(`defi_positions.${positionType}`)}
      </Text>
      {tokens.map((token, i) => (
        <View key={i} style={styles.underlyingBalancesWrapper}>
          <View>
            <DeFiAvatarWithBadge
              networkIconAvatar={networkIconAvatar}
              avatarName={token.name}
              avatarIconUrl={token.iconUrl}
            />
          </View>

          <View style={styles.balances}>
            <View style={styles.assetName}>
              <Text variant={TextVariant.BodyMDMedium}>{token.symbol}</Text>
            </View>
          </View>

          <View style={styles.arrow}>
            <SensitiveText
              variant={TextVariant.BodyMDMedium}
              isHidden={false}
              length={SensitiveTextLength.Medium}
            >
              {token.marketValue
                ? formatWithThreshold(token.marketValue, 0.01, I18n.locale, {
                    style: 'currency',
                    currency: 'USD',
                  })
                : null}
            </SensitiveText>
            <SensitiveText
              variant={TextVariant.BodySMMedium}
              isHidden={false}
              length={SensitiveTextLength.Short}
              style={styles.alternativeText}
            >
              {formatWithThreshold(token.balance, 0.00001, I18n.locale, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 5,
              })}{' '}
              {token.symbol}
            </SensitiveText>
          </View>
        </View>
      ))}
    </View>
  );
};

export const PositionGroups = ({
  positionType,
  positionGroups,
  networkIconAvatar,
}: {
  positionType: PositionType;
  positionGroups: NonNullable<
    GroupedDeFiPositions['protocols'][number]['positionTypes'][PositionType]
  >;
  networkIconAvatar: ImageSourcePropType | undefined;
}) => {
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
            <PositionGroupDetails
              positionType={positionType}
              tokens={position.underlyings}
              networkIconAvatar={networkIconAvatar}
            />
            <PositionGroupDetails
              positionType={'reward'}
              tokens={position.underlyingRewards}
              networkIconAvatar={networkIconAvatar}
            />
            {!isLast && <Summary.Separator />}
          </Fragment>
        );
      })}
    </>
  );
};

interface DeFiProtocolPositionsParams {
  protocolAggregate: GroupedDeFiPositions['protocols'][number];
  networkIconAvatar: ImageSourcePropType | undefined;
}

const DeFiProtocolPositions = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const { protocolAggregate, networkIconAvatar } =
    useParams<DeFiProtocolPositionsParams>();

  useEffect(() => {
    navigation.setOptions(
      getDeFiProtocolPositionDetailsNavbarOptions(navigation),
    );
  }, [navigation]);

  return (
    <View>
      <View style={styles.detailsWrapper}>
        <View>
          <Text variant={TextVariant.DisplayMD}>
            {protocolAggregate.protocolDetails.name}
          </Text>
          <Text
            variant={TextVariant.BodyMDMedium}
            style={styles.alternativeText}
          >
            {formatWithThreshold(
              protocolAggregate.aggregatedMarketValue,
              0.01,
              I18n.locale,
              { style: 'currency', currency: 'USD' },
            )}
          </Text>
        </View>

        <View>
          <DeFiAvatarWithBadge
            networkIconAvatar={networkIconAvatar}
            avatarName={protocolAggregate.protocolDetails.name}
            avatarIconUrl={protocolAggregate.protocolDetails.iconUrl}
          />
        </View>
      </View>
      <View style={styles.separatorWrapper}>
        <Summary.Separator />
      </View>
      <View style={styles.ProtocolDetailsPositionsWrapper}>
        {PositionTypes.map((positionType) => {
          const positionGroups = protocolAggregate.positionTypes[positionType];

          if (!positionGroups) {
            return null;
          }

          return (
            <PositionGroups
              key={positionType}
              positionType={positionType}
              positionGroups={positionGroups}
              networkIconAvatar={networkIconAvatar}
            />
          );
        })}
      </View>
    </View>
  );
};

export default DeFiProtocolPositions;
