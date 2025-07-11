// app/components/UI/Stake/components/EarnTokenSelector/index.tsx
import React from 'react';
import { useStyles } from '../../../../../component-library/hooks';
import { View } from 'react-native';
import styleSheet from './EarnTokenSelector.styles';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import SelectButton, {
  SelectButtonSize,
} from '../../../../../component-library/components/Select/SelectButton';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import NetworkAssetLogo from '../../../NetworkAssetLogo';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import { useSelector } from 'react-redux';
import { selectNetworkName } from '../../../../../selectors/networkInfos';
import { getNetworkImageSource } from '../../../../../util/networks';
import { TokenI } from '../../../Tokens/types';
import { EARN_INPUT_VIEW_ACTIONS } from '../../Views/EarnInputView/EarnInputView.types';
import useEarnTokens from '../../hooks/useEarnTokens';
import { EarnTokenDetails } from '../../types/lending.types';
import { trace, TraceName } from '../../../../../util/trace';

interface EarnTokenSelectorProps {
  token: TokenI;
  action: EARN_INPUT_VIEW_ACTIONS;
}

const EarnTokenSelector = ({
  token: someEarnToken,
  action,
}: EarnTokenSelectorProps) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const networkName = useSelector(selectNetworkName);
  const { getEarnToken, getOutputToken } = useEarnTokens();
  const earnToken = getEarnToken(someEarnToken);
  const outputToken = getOutputToken(someEarnToken);
  const token = (earnToken || outputToken) as EarnTokenDetails;
  const apr = parseFloat(token?.experience?.apr ?? '0').toFixed(1);

  const handlePress = () => {
    trace({ name: TraceName.EarnTokenList });
    
    const tokenFilter = {
      includeReceiptTokens: false,
    };

    if (action === EARN_INPUT_VIEW_ACTIONS.WITHDRAW) {
      tokenFilter.includeReceiptTokens = true;
    }

    navigation.navigate('StakeModals', {
      screen: Routes.STAKING.MODALS.EARN_TOKEN_LIST,
      params: {
        tokenFilter,
        onItemPressScreen: action,
      },
    });
  };

  const renderTokenAvatar = () => {
    if (token.isNative) {
      return (
        <NetworkAssetLogo
          chainId={token.chainId ?? ''}
          ticker={token.ticker ?? ''}
          big={false}
          biggest
          testID={`earn-token-selector-${token.symbol}-${token.chainId}`}
          style={styles.networkAvatar}
        />
      );
    }

    return (
      <AvatarToken
        name={token.symbol}
        imageSource={{ uri: token.image }}
        size={AvatarSize.Md}
      />
    );
  };

  const renderStartAccessory = () => (
    <View style={styles.startAccessoryContainer}>
      <BadgeWrapper
        badgePosition={BadgePosition.BottomRight}
        badgeElement={
          <Badge
            variant={BadgeVariant.Network}
            name={networkName}
            // @ts-expect-error The utils/network file is still JS and this function expects a networkType that should be optional
            imageSource={getNetworkImageSource({ chainId: token.chainId })}
          />
        }
      >
        {renderTokenAvatar()}
      </BadgeWrapper>
      <Text
        variant={TextVariant.BodyMDMedium}
        style={styles.tokenText}
        numberOfLines={1}
      >
        {token.name}
      </Text>
    </View>
  );

  const renderEndAccessory = () => (
    <View style={styles.endAccessoryContainer}>
      <Text
        variant={TextVariant.BodyMDMedium}
        color={TextColor.Success}
        numberOfLines={1}
      >
        {`${apr}% APR`}
      </Text>

      {token?.balanceFormatted !== undefined && (
        <Text
          style={styles.balanceText}
          variant={TextVariant.BodySMMedium}
          color={TextColor.Alternative}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {token?.balanceFormatted}
        </Text>
      )}
    </View>
  );

  return (
    <SelectButton
      size={SelectButtonSize.Lg}
      style={styles.container}
      onPress={handlePress}
      startAccessory={renderStartAccessory()}
      endAccessory={renderEndAccessory()}
      testID="earn-token-selector"
    />
  );
};

export default EarnTokenSelector;
