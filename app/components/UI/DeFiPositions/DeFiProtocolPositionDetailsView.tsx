import React, { useCallback } from 'react';
import { ImageSourcePropType, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
  SensitiveText,
  SensitiveTextLength,
} from '@metamask/design-system-react-native';
import type { AppStackNavigationProp } from '../../../core/NavigationService/types';
import styleSheet from './DeFiProtocolPositionDetails.styles';
import { CommonSelectorsIDs } from '../../../util/Common.testIds';
import { formatWithThreshold } from '../../../util/assets';
import I18n from '../../../../locales/i18n';
import DeFiAvatarWithBadge from './DeFiAvatarWithBadge';
import Summary from '../../Base/Summary';
import { useStyles } from '../../hooks/useStyles';
import { WalletViewSelectorsIDs } from '../../Views/Wallet/WalletView.testIds';

export const DEFI_PROTOCOL_POSITION_DETAILS_BALANCE_TEST_ID =
  'defi_protocol_position_details_balance';

interface DeFiProtocolPositionDetailsViewProps {
  title: string;
  marketValue: number | undefined;
  iconUrl: string;
  networkIconAvatar: ImageSourcePropType | undefined;
  privacyMode: boolean;
  children: React.ReactNode;
}

/**
 * Shared chrome for the DeFi protocol details screen: header, protocol title,
 * total market value, protocol avatar and separator. V1 and V2 supply the
 * header fields plus their own position groups as children.
 */
const DeFiProtocolPositionDetailsView: React.FC<
  DeFiProtocolPositionDetailsViewProps
> = ({
  title,
  marketValue,
  iconUrl,
  networkIconAvatar,
  privacyMode,
  children,
}) => {
  const { styles } = useStyles(styleSheet, undefined);
  const navigation = useNavigation<AppStackNavigationProp>();

  const handleBack = useCallback(() => {
    navigation.pop();
  }, [navigation]);

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
            <Text variant={TextVariant.DisplayMd}>{title}</Text>
            <SensitiveText
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
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
        {children}
      </View>
    </SafeAreaView>
  );
};

export default DeFiProtocolPositionDetailsView;
