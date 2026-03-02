import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
} from '@metamask/design-system-react-native';
import { Spinner } from '@metamask/design-system-react-native/dist/components/temp-components/Spinner/index.cjs';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import images from 'images/image-icons';
import React, { useCallback, useEffect } from 'react';
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
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import { USDC_SYMBOL, USDC_TOKEN_ICON_URL } from '@metamask/perps-controller';
import { usePredictBalance } from '../../hooks/usePredictBalance';
import { usePredictDeposit } from '../../hooks/usePredictDeposit';
import { formatPrice } from '../../utils/format';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { PredictNavigationParamList } from '../../types/navigation';
import { usePredictWithdraw } from '../../hooks/usePredictWithdraw';
import { PredictEventValues } from '../../constants/eventNames';

// This is a temporary component that will be removed when the deposit flow is fully implemented
interface PredictBalanceProps {
  onLayout?: (height: number) => void;
}

const PredictBalance: React.FC<PredictBalanceProps> = ({ onLayout }) => {
  const tw = useTailwind();
  const privacyMode = useSelector(selectPrivacyMode);

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

  const handleWithdraw = useCallback(() => {
    withdraw();
  }, [withdraw]);

  if (isLoading) {
    return (
      <Box
        twClassName="bg-muted rounded-xl p-4 mx-4 gap-3"
        testID="predict-balance-card-skeleton"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          alignItems={BoxAlignItems.Center}
        >
          <Box twClassName="gap-2">
            <Skeleton width={120} height={24} style={tw.style('rounded')} />
            <Skeleton width={100} height={16} style={tw.style('rounded')} />
          </Box>
          <Skeleton width={48} height={48} style={tw.style('rounded-full')} />
        </Box>
        <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
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
    <>
      {isAddingFunds && (
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          twClassName="bg-muted rounded-t-xl p-4 mx-4 border-b border-muted"
        >
          <Text style={tw.style('text-body-sm')}>
            {strings('predict.deposit.adding_your_funds')}
          </Text>
          <Spinner />
        </Box>
      )}
      <Box
        style={tw.style(
          'bg-muted p-4 mx-4 gap-3 rounded-xl',
          isAddingFunds ? 'rounded-t-none' : 'rounded-t-xl',
        )}
        testID="predict-balance-card"
        onLayout={(event) => {
          const { height } = event.nativeEvent.layout;
          onLayout?.(height);
        }}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          alignItems={BoxAlignItems.Center}
        >
          <Box>
            <SensitiveText
              variant={ComponentTextVariant.BodyMDBold}
              isHidden={privacyMode}
              length={SensitiveTextLength.Medium}
            >
              {formatPrice(balance, { maximumDecimals: 2 })}
            </SensitiveText>
            <Text
              style={tw.style('color-alternative text-body-sm')}
              color={TextColor.TextAlternative}
            >
              {strings('predict.available_balance')}
            </Text>
          </Box>
          <BadgeWrapper
            style={tw.style('self-center')}
            badgePosition={BadgePosition.BottomRight}
            badgeElement={
              <Badge
                variant={BadgeVariant.Network}
                imageSource={images.POL}
                style={tw.style('border-background-muted')}
                name="Polygon"
              />
            }
          >
            <AvatarToken
              name={USDC_SYMBOL}
              imageSource={{ uri: USDC_TOKEN_ICON_URL }}
              size={AvatarSize.Md}
            />
          </BadgeWrapper>
        </Box>
        <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
          <Button
            variant={
              hasBalance ? ButtonVariants.Secondary : ButtonVariants.Primary
            }
            style={tw.style('flex-1')}
            label={strings('predict.deposit.add_funds')}
            onPress={handleAddFunds}
          />
          {hasBalance && (
            <Button
              variant={ButtonVariants.Secondary}
              style={tw.style('flex-1')}
              label={strings('predict.deposit.withdraw')}
              onPress={handleWithdraw}
            />
          )}
        </Box>
      </Box>
    </>
  );
};

export default PredictBalance;
