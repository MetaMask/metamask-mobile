import React, { Fragment, useEffect } from 'react';
import { ImageSourcePropType, View } from 'react-native';
import { useParams } from '../../../../util/navigation/navUtils';
import { GroupedDeFiPositions } from '@metamask/assets-controllers';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../util/theme';
import { getDeFiProtocolPositionsDetailsNavbarOptions } from '../../Navbar';
import createStyles from '../styles';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';
import AvatarToken from '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import { formatWithThreshold } from '../../../../util/assets';
import I18n from '../../../../../locales/i18n';
import Summary from '../../../Base/Summary';
import { PositionType } from '@metamask/assets-controllers/dist/DeFiPositionsController/fetch-positions.cjs';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../component-library/components/Texts/SensitiveText';

const PositionTypeLabels: Record<PositionType, string> = {
  supply: 'Supplied',
  stake: 'Staked',
  borrow: 'Borrowed',
  reward: 'Rewards',
};

const PositionGroupDetails = ({
  positionTypeLabel,
  tokens,
  networkIconAvatar,
}: {
  positionTypeLabel: string;
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
        {positionTypeLabel}
      </Text>
      {tokens.map((token, i) => (
        <View key={i} style={styles.underlyingBalancesWrapper}>
          <View>
            <BadgeWrapper
              badgePosition={BadgePosition.BottomRight}
              badgeElement={
                <Badge
                  variant={BadgeVariant.Network}
                  imageSource={networkIconAvatar}
                />
              }
            >
              <AvatarToken
                name={token.name}
                imageSource={{
                  uri: token.iconUrl,
                }}
                size={AvatarSize.Md}
              />
            </BadgeWrapper>
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

const PositionGroups = ({
  positionTypeLabel,
  positionGroups,
  networkIconAvatar,
}: {
  positionTypeLabel: string;
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
              positionTypeLabel={positionTypeLabel}
              tokens={position.underlyings}
              networkIconAvatar={networkIconAvatar}
            />
            <PositionGroupDetails
              positionTypeLabel={PositionTypeLabels.reward}
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

interface DeFiProtocolPositionsDetailsParams {
  protocolAggregate: GroupedDeFiPositions['protocols'][number];
  networkIconAvatar: ImageSourcePropType | undefined;
}

const DeFiProtocolPositionsDetails = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const { protocolAggregate, networkIconAvatar } =
    useParams<DeFiProtocolPositionsDetailsParams>();

  useEffect(() => {
    navigation.setOptions(
      getDeFiProtocolPositionsDetailsNavbarOptions(navigation),
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
          <BadgeWrapper
            badgePosition={BadgePosition.BottomRight}
            badgeElement={
              <Badge
                variant={BadgeVariant.Network}
                imageSource={networkIconAvatar}
              />
            }
          >
            <AvatarToken
              name={protocolAggregate.protocolDetails.name}
              imageSource={{ uri: protocolAggregate.protocolDetails.iconUrl }}
              size={AvatarSize.Md}
            />
          </BadgeWrapper>
        </View>
      </View>
      <View style={styles.separatorWrapper}>
        <Summary.Separator />
      </View>
      <View style={styles.ProtocolDetailsPositionsWrapper}>
        {Object.entries(PositionTypeLabels).map(
          ([positionTypeKey, positionTypeLabel]: [string, string]) => {
            const positionGroups =
              protocolAggregate.positionTypes[positionTypeKey as PositionType];

            if (!positionGroups) {
              return null;
            }

            return (
              <PositionGroups
                key={positionTypeKey}
                positionTypeLabel={positionTypeLabel}
                positionGroups={positionGroups}
                networkIconAvatar={networkIconAvatar}
              />
            );
          },
        )}
      </View>
    </View>
  );
};

export default DeFiProtocolPositionsDetails;
