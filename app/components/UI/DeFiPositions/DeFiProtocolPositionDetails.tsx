import React, { useEffect } from 'react';
import { View } from 'react-native';
import styleSheet from './DeFiProtocolPositionDetails.styles';
import { useNavigation } from '@react-navigation/native';
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
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootParamList } from '../../../util/navigation';

type DeFiProtocolPositionDetailsProps = StackScreenProps<
  RootParamList,
  'DeFiProtocolPositionDetails'
>;

export const DEFI_PROTOCOL_POSITION_DETAILS_BALANCE_TEST_ID =
  'defi_protocol_position_details_balance';

const DeFiProtocolPositionDetails: React.FC<
  DeFiProtocolPositionDetailsProps
> = ({ route }) => {
  const { styles } = useStyles(styleSheet, undefined);
  const navigation = useNavigation();

  const { protocolAggregate, networkIconAvatar } = route.params;
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
