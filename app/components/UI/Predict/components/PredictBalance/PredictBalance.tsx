import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  Spinner,
  Text,
  TitleHub,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import images from 'images/image-icons';
import React, { useCallback, useEffect, useMemo } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { predictQueries } from '../../queries';
import { strings } from '../../../../../../locales/i18n';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import { TextVariant as ComponentTextVariant } from '../../../../../component-library/components/Texts/Text/Text.types';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { USDC_SYMBOL, USDC_TOKEN_ICON_URL } from '@metamask/perps-controller';
import { usePredictBalance } from '../../hooks/usePredictBalance';
import { usePredictDeposit } from '../../hooks/usePredictDeposit';
import { formatPrice } from '../../utils/format';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { PredictNavigationParamList } from '../../types/navigation';
import { usePredictWithdraw } from '../../hooks/usePredictWithdraw';
import { usePredictAccountState } from '../../hooks/usePredictAccountState';
import { PredictEventValues } from '../../constants/eventNames';
import { selectMetaMaskPayFlags } from '../../../../../selectors/featureFlagController/confirmations';
import { PREDICT_BALANCE_TEST_IDS } from './PredictBalance.testIds';
import { selectPredictPortfolioEnabledFlag } from '../../selectors/featureFlags';
import Routes from '../../../../../constants/navigation/Routes';

interface PredictBalanceProps {
  onLayout?: (height: number) => void;
  onDepositWalletWithdrawPress?: () => void;
  /** Hides the screen title row — used when embedded in wallet discovery tabs. */
  hideTitle?: boolean;
}

const PredictBalance: React.FC<PredictBalanceProps> = ({
  onLayout,
  onDepositWalletWithdrawPress,
  hideTitle = false,
}) => {
  const tw = useTailwind();
  const privacyMode = useSelector(selectPrivacyMode);
  const { enableDepositWalletWithdraw } = useSelector(selectMetaMaskPayFlags);
  const predictPortfolioEnabled = useSelector(
    selectPredictPortfolioEnabledFlag,
  );

  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();

  const queryClient = useQueryClient();
  const { data: balance = 0, isLoading } = usePredictBalance();
  const { deposit, isDepositPending } = usePredictDeposit();
  const { withdraw } = usePredictWithdraw();
  const { executeGuardedAction } = usePredictActionGuard({
    navigation,
  });

  const isAddingFunds = isDepositPending;
  const hasBalance = balance > 0;
  const { data: accountState } = usePredictAccountState({
    enabled: hasBalance,
  });
  const walletType = accountState?.walletType;
  const isWithdrawDisabled = hasBalance && !walletType;
  const actionButtonStyle = tw.style(
    'flex-1',
    predictPortfolioEnabled && 'h-12 items-center justify-center px-2',
  );
  const actionButtonSize = predictPortfolioEnabled ? ButtonSize.Lg : undefined;
  const actionButtonLabelTextVariant = predictPortfolioEnabled
    ? ComponentTextVariant.BodySMMedium
    : undefined;

  const amountEndAccessory = useMemo(
    () => (
      <BadgeWrapper
        badgePosition={BadgePosition.BottomRight}
        badgeElement={
          <Badge
            variant={BadgeVariant.Network}
            imageSource={images.POL}
            style={tw.style('border-background-muted')}
            name="Polygon"
          />
        }
        style={tw.style('self-end')}
      >
        <AvatarToken
          name={USDC_SYMBOL}
          imageSource={{ uri: USDC_TOKEN_ICON_URL }}
          size={AvatarSize.Md}
        />
      </BadgeWrapper>
    ),
    [tw],
  );

  useEffect(() => {
    if (!isDepositPending) {
      queryClient.invalidateQueries({
        queryKey: predictQueries.balance.keys.all(),
      });
    }
  }, [isDepositPending, queryClient]);

  const handleAddFunds = useCallback(() => {
    executeGuardedAction(
      () => {
        deposit({
          analyticsProperties: {
            entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_BALANCE,
          },
        });
      },
      { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.DEPOSIT },
    );
  }, [deposit, executeGuardedAction]);

  const handlePositionsPress = useCallback(() => {
    navigation.navigate(Routes.PREDICT.POSITIONS);
  }, [navigation]);

  const handleWithdraw = useCallback(() => {
    if (!walletType) {
      return;
    }

    if (walletType === 'deposit-wallet' && !enableDepositWalletWithdraw) {
      onDepositWalletWithdrawPress?.();
      return;
    }

    withdraw();
  }, [
    enableDepositWalletWithdraw,
    onDepositWalletWithdrawPress,
    walletType,
    withdraw,
  ]);

  if (isLoading) {
    return (
      <Box twClassName="px-4 gap-3" testID={PREDICT_BALANCE_TEST_IDS.SKELETON}>
        <Box twClassName="gap-2">
          {!hideTitle && (
            <Skeleton width={120} height={24} style={tw.style('rounded')} />
          )}
          <Skeleton width={160} height={48} style={tw.style('rounded')} />
          <Skeleton width={100} height={16} style={tw.style('rounded')} />
        </Box>
        <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3 mt-4">
          <Skeleton
            width="50%"
            height={40}
            style={tw.style('rounded-xl flex-1')}
          />
          <Skeleton
            width="50%"
            height={40}
            style={tw.style('rounded-xl flex-1')}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box
      testID={PREDICT_BALANCE_TEST_IDS.CARD}
      onLayout={(layoutEvent) => {
        const { height } = layoutEvent.nativeEvent.layout;
        onLayout?.(height);
      }}
    >
      {isAddingFunds && (
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          twClassName="px-4 py-3 border-b border-muted"
        >
          <Text style={tw.style('text-body-sm')}>
            {strings('predict.deposit.adding_your_funds')}
          </Text>
          <Spinner />
        </Box>
      )}
      <Box twClassName="px-4">
        <TitleHub
          twClassName="w-full"
          title={hideTitle ? undefined : strings('wallet.predict')}
          amount={
            <SensitiveText
              variant={ComponentTextVariant.DisplayLG}
              isHidden={privacyMode}
              length={SensitiveTextLength.Medium}
            >
              {formatPrice(balance, { maximumDecimals: 2 })}
            </SensitiveText>
          }
          bottomLabel={strings('predict.available_balance')}
          amountEndAccessory={amountEndAccessory}
          amountWrapperProps={{
            twClassName: 'w-full justify-between items-end',
          }}
        />
        <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3 mt-4">
          {predictPortfolioEnabled && (
            <Button
              variant={ButtonVariants.Secondary}
              size={actionButtonSize}
              style={actionButtonStyle}
              labelTextVariant={actionButtonLabelTextVariant}
              label={strings('predict.tabs.positions')}
              onPress={handlePositionsPress}
              testID={PREDICT_BALANCE_TEST_IDS.POSITIONS_BUTTON}
            />
          )}
          <Button
            variant={
              hasBalance ? ButtonVariants.Secondary : ButtonVariants.Primary
            }
            size={actionButtonSize}
            style={actionButtonStyle}
            labelTextVariant={actionButtonLabelTextVariant}
            label={strings('predict.deposit.add_funds')}
            onPress={handleAddFunds}
          />
          {hasBalance && (
            <Button
              variant={ButtonVariants.Secondary}
              size={actionButtonSize}
              style={actionButtonStyle}
              labelTextVariant={actionButtonLabelTextVariant}
              label={strings('predict.deposit.withdraw')}
              onPress={handleWithdraw}
              isDisabled={isWithdrawDisabled}
              testID={PREDICT_BALANCE_TEST_IDS.WITHDRAW_BUTTON}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default PredictBalance;
