// app/components/UI/Stake/components/EarnTokenSelector/index.tsx
import React from 'react';
import { useStyles } from '../../../../../component-library/hooks';
import { View } from 'react-native';
import styleSheet from './EarnTokenSelector.styles';
import {
  AvatarTokenSize,
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import AssetLogo from '../../../Assets/components/AssetLogo/AssetLogo';
import SelectButton, {
  SelectButtonSize,
} from '../../../../../component-library/components/Select/SelectButton';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import NetworkAssetLogo from '../../../NetworkAssetLogo';
import { getNetworkImageSource } from '../../../../../util/networks';
import { TokenI } from '../../../Tokens/types';
import { EARN_INPUT_VIEW_ACTIONS } from '../../Views/EarnInputView/EarnInputView.types';
import useEarnTokens from '../../hooks/useEarnTokens';
import { EarnTokenDetails } from '../../types/lending.types';
import { formatEarnRatePercentage } from '../../../Earn/utils';
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
  const navigation = useNavigation<AppNavigationProp>();
  const { getEarnToken, getOutputToken } = useEarnTokens();
  const earnToken = getEarnToken(someEarnToken);
  const outputToken = getOutputToken(someEarnToken);

  // For withdrawal flows we want to display the output token (e.g. sTRX, stETH),
  // for staking flows we want to display the earn token (e.g. TRX, ETH).
  const tokenToRender = (
    action === EARN_INPUT_VIEW_ACTIONS.WITHDRAW
      ? outputToken || someEarnToken
      : earnToken || outputToken || someEarnToken
  ) as EarnTokenDetails | TokenI | undefined;

  const rawApr =
    (tokenToRender as EarnTokenDetails | undefined)?.experience?.apr ?? '';

  const aprValue = parseFloat(rawApr);

  const apr =
    Number.isFinite(aprValue) && aprValue > 0
      ? formatEarnRatePercentage(aprValue)
      : undefined;

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
    if (tokenToRender?.isNative) {
      return (
        <NetworkAssetLogo
          chainId={tokenToRender.chainId ?? ''}
          ticker={tokenToRender.ticker ?? ''}
          big={false}
          biggest
          testID={`earn-token-selector-${tokenToRender.symbol}-${tokenToRender.chainId}`}
          style={styles.networkAvatar}
        />
      );
    }

    return (
      <AssetLogo asset={tokenToRender as TokenI} size={AvatarTokenSize.Lg} />
    );
  };

  const balanceFormatted = (tokenToRender as EarnTokenDetails | undefined)
    ?.balanceFormatted;

  const renderStartAccessory = () => (
    <View style={styles.startAccessoryContainer}>
      <BadgeWrapper
        style={styles.avatarWrapper}
        position={BadgeWrapperPosition.BottomRight}
        badge={
          <BadgeNetwork
            twClassName="h-4 w-4 rounded bg-default"
            src={
              tokenToRender?.chainId
                ? (getNetworkImageSource({
                    chainId: tokenToRender.chainId,
                  }) as React.ComponentProps<typeof BadgeNetwork>['src'])
                : undefined
            }
          />
        }
      >
        {renderTokenAvatar()}
      </BadgeWrapper>
      <View style={styles.tokenDetails}>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          numberOfLines={1}
        >
          {tokenToRender?.name ?? ''}
        </Text>
        {balanceFormatted !== undefined && (
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {balanceFormatted}
          </Text>
        )}
      </View>
    </View>
  );

  const renderEndAccessory = () =>
    apr ? (
      <View style={styles.endAccessoryContainer}>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.SuccessDefault}
          numberOfLines={1}
        >
          {`${apr}% APR`}
        </Text>
      </View>
    ) : null;

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
