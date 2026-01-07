import React from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { IconColor } from '../../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../../component-library/hooks';
import AvatarToken from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import InfoSection from '../../UI/info-row/info-section/info-section';
import Tooltip from '../../UI/Tooltip/Tooltip';
import styleSheet from './lending-receive-section.styles';
import { useLendingDepositDetails } from './useLendingDepositDetails';

export const LENDING_RECEIVE_SECTION_TEST_ID = 'lending-receive-section';

const LendingReceiveSection = () => {
  const { styles } = useStyles(styleSheet, {});
  const details = useLendingDepositDetails();

  if (!details) {
    return null;
  }

  const {
    receiptTokenName,
    receiptTokenAmount,
    receiptTokenAmountFiat,
    receiptTokenImage,
  } = details;

  return (
    <InfoSection testID={LENDING_RECEIVE_SECTION_TEST_ID}>
      <View style={styles.infoSectionContent}>
        <View style={styles.receiveRow}>
          <Text variant={TextVariant.BodyMDMedium}>
            {strings('earn.receive')}
          </Text>
          <Tooltip
            title={strings('earn.receive')}
            content={strings('earn.tooltip_content.receive')}
            iconColor={IconColor.Alternative}
          />
        </View>
        <View style={styles.receiptTokenRow}>
          <View style={styles.receiptTokenRowLeft}>
            <AvatarToken
              name={receiptTokenName}
              imageSource={{ uri: receiptTokenImage }}
              size={AvatarSize.Xs}
              style={styles.receiveTokenIcon}
              isIpfsGatewayCheckBypassed
            />
            <Text variant={TextVariant.BodyMD}>{receiptTokenName}</Text>
          </View>
          <View style={styles.receiptTokenRowRight}>
            <Text>{receiptTokenAmount}</Text>
            <Text color={TextColor.Alternative}>{receiptTokenAmountFiat}</Text>
          </View>
        </View>
      </View>
    </InfoSection>
  );
};

export default LendingReceiveSection;
