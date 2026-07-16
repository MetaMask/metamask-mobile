import React, { useCallback } from 'react';
import type {
  DeFiProtocolPositionGroup,
  GroupedDeFiPositions,
} from '@metamask/assets-controllers';
import { ImageSourcePropType, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { AppStackNavigationProp } from '../../../core/NavigationService/types';
import { HeaderStandard } from '@metamask/design-system-react-native';
import styleSheet from './DeFiProtocolPositionDetails.styles';
import { useParams } from '../../../util/navigation/navUtils';
import { CommonSelectorsIDs } from '../../../util/Common.testIds';
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
import DeFiProtocolPositionGroupsV2 from './DeFiProtocolPositionGroupsV2';
import { useStyles } from '../../hooks/useStyles';
import { WalletViewSelectorsIDs } from '../../Views/Wallet/WalletView.testIds';

export const DEFI_PROTOCOL_POSITION_DETAILS_BALANCE_TEST_ID =
  'defi_protocol_position_details_balance';

interface DeFiProtocolPositionDetailsParams {
  protocolAggregate?: GroupedDeFiPositions['protocols'][number];
  protocolPositionGroup?: DeFiProtocolPositionGroup;
  networkIconAvatar: ImageSourcePropType | undefined;
}

const DeFiProtocolPositionDetails: React.FC = () => {
  const { styles } = useStyles(styleSheet, undefined);
  const navigation = useNavigation<AppStackNavigationProp>();

  const { protocolAggregate, protocolPositionGroup, networkIconAvatar } =
    useParams<DeFiProtocolPositionDetailsParams>();
  const privacyMode = useSelector(selectPrivacyMode);

  const handleBack = useCallback(() => {
    navigation.pop();
  }, [navigation]);

  const isV2 = Boolean(protocolPositionGroup);
  const title = isV2
    ? protocolPositionGroup?.protocolId
    : protocolAggregate?.protocolDetails.name;
  const marketValue = isV2
    ? protocolPositionGroup?.marketValue
    : protocolAggregate?.aggregatedMarketValue;
  const iconUrl = isV2
    ? protocolPositionGroup?.protocolIconUrl
    : protocolAggregate?.protocolDetails.iconUrl;

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={styles.protocolPositionDetailsWrapper}
      testID={WalletViewSelectorsIDs.DEFI_POSITIONS_DETAILS_CONTAINER}
    >
      <HeaderStandard
        title=""
        onBack={handleBack}
        includesTopInset
        backButtonProps={{ testID: CommonSelectorsIDs.BACK_ARROW_BUTTON }}
      />
      <View style={styles.protocolPositionDetailsContent}>
        <View style={styles.detailsWrapper}>
          <View>
            <Text variant={TextVariant.DisplayMD}>{title}</Text>
            <SensitiveText
              variant={TextVariant.BodyMDMedium}
              color={TextColor.Alternative}
              isHidden={privacyMode}
              length={SensitiveTextLength.Medium}
              testID={DEFI_PROTOCOL_POSITION_DETAILS_BALANCE_TEST_ID}
            >
              {formatWithThreshold(marketValue ?? 0, 0.01, I18n.locale, {
                style: 'currency',
                currency: 'USD',
              })}
            </SensitiveText>
          </View>

          <View>
            <DeFiAvatarWithBadge
              networkIconAvatar={networkIconAvatar}
              avatarName={title ?? ''}
              avatarIconUrl={iconUrl ?? ''}
            />
          </View>
        </View>
        <View style={styles.separatorWrapper}>
          <Summary.Separator />
        </View>
        {isV2 && protocolPositionGroup ? (
          <DeFiProtocolPositionGroupsV2
            protocolPositionGroup={protocolPositionGroup}
            networkIconAvatar={networkIconAvatar}
            privacyMode={privacyMode}
          />
        ) : protocolAggregate ? (
          <DeFiProtocolPositionGroups
            protocolAggregate={protocolAggregate}
            networkIconAvatar={networkIconAvatar}
            privacyMode={privacyMode}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
};

export default DeFiProtocolPositionDetails;
