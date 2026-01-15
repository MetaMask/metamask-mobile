import React, { useEffect } from 'react';
import { GroupedDeFiPositions } from '@metamask/assets-controllers';
import { ImageSourcePropType, View } from 'react-native';
import styleSheet from './DeFiProtocolPositionDetails.styles';
import { useNavigation } from '@react-navigation/native';
import { useParams } from '../../../util/navigation/navUtils';
import { getDeFiProtocolPositionDetailsNavbarOptions } from '../Navbar';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { formatWithThreshold } from '../../../util/assets';
import I18n from '../../../../locales/i18n';
import DeFiAvatarWithBadge from './DeFiAvatarWithBadge';
import Summary from '../../Base/Summary';
import { useSelector } from 'react-redux';
import { selectPrivacyMode } from '../../../selectors/preferencesController';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../component-library/components/Texts/SensitiveText';
import DeFiProtocolPositionGroups from './DeFiProtocolPositionGroups';
import { useStyles } from '../../hooks/useStyles';
import { WalletViewSelectorsIDs } from '../../Views/Wallet/WalletView.testIds';

export const DEFI_PROTOCOL_POSITION_DETAILS_BALANCE_TEST_ID =
  'defi_protocol_position_details_balance';

interface DeFiProtocolPositionDetailsParams {
  protocolAggregate: GroupedDeFiPositions['protocols'][number];
  networkIconAvatar: ImageSourcePropType | undefined;
}

const DeFiProtocolPositionDetails: React.FC = () => {
  const { styles } = useStyles(styleSheet, undefined);
  const navigation = useNavigation();

  const { protocolAggregate, networkIconAvatar } =
    useParams<DeFiProtocolPositionDetailsParams>();
  const privacyMode = useSelector(selectPrivacyMode);

  useEffect(() => {
    navigation.setOptions(
      getDeFiProtocolPositionDetailsNavbarOptions(navigation),
    );
  }, [navigation]);

  return (
    <View
      testID={WalletViewSelectorsIDs.DEFI_POSITIONS_DETAILS_CONTAINER}
      style={styles.protocolPositionDetailsWrapper}
    >
      <View style={styles.detailsWrapper}>
        <View>
          <Text variant={TextVariant.DisplayMD}>
            {protocolAggregate.protocolDetails.name}
          </Text>
          <SensitiveText
            variant={TextVariant.BodyMDMedium}
            color={TextColor.Alternative}
            isHidden={privacyMode}
            length={SensitiveTextLength.Medium}
            testID={DEFI_PROTOCOL_POSITION_DETAILS_BALANCE_TEST_ID}
          >
            {formatWithThreshold(
              protocolAggregate.aggregatedMarketValue,
              0.01,
              I18n.locale,
              { style: 'currency', currency: 'USD' },
            )}
          </SensitiveText>
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
      <DeFiProtocolPositionGroups
        protocolAggregate={protocolAggregate}
        networkIconAvatar={networkIconAvatar}
        privacyMode={privacyMode}
      />
    </View>
  );
};

export default DeFiProtocolPositionDetails;
