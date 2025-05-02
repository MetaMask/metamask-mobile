import React, { useEffect } from 'react';
import { GroupedDeFiPositions } from '@metamask/assets-controllers';
import { useTheme } from '../../../util/theme';
import { ImageSourcePropType, View } from 'react-native';
import styleSheet from './DeFiProtocolPositionDetails.styles';
import { useNavigation } from '@react-navigation/native';
import { useParams } from '../../../util/navigation/navUtils';
import { getDeFiProtocolPositionDetailsNavbarOptions } from '../Navbar';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { formatWithThreshold } from '../../../util/assets';
import I18n from '../../../../locales/i18n';
import DeFiAvatarWithBadge from './DeFiAvatarWithBadge';
import Summary from '../../Base/Summary';
import { PositionTypes } from './position-types';
import { PositionGroups } from './DeFiProtocolPositions';

interface DeFiProtocolPositionDetailsParams {
  protocolAggregate: GroupedDeFiPositions['protocols'][number];
  networkIconAvatar: ImageSourcePropType | undefined;
}

const DeFiProtocolPositionDetails = () => {
  const theme = useTheme();
  const styles = styleSheet({ theme });
  const navigation = useNavigation();

  const { protocolAggregate, networkIconAvatar } =
    useParams<DeFiProtocolPositionDetailsParams>();

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

export default DeFiProtocolPositionDetails;
