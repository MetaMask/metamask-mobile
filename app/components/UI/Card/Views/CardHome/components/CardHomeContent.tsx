import React, { useMemo } from 'react';
import { Image, RefreshControl, ScrollView } from 'react-native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../../util/theme';
import { Skeleton } from '../../../../../../component-library/components/Skeleton';
import CardImage from '../../../components/CardImage';
import CardMessageBox from '../../../components/CardMessageBox/CardMessageBox';
import SpendingLimitProgressBar from '../../../components/SpendingLimitProgressBar/SpendingLimitProgressBar';
import { strings } from '../../../../../../../locales/i18n';
import { CardHomeSelectors } from '../CardHome.testIds';
import {
  AllowanceState,
  CardStatus,
  CardType,
  CardMessageBoxType,
} from '../../../types';
import CardBalanceSection from './CardBalanceSection';
import CardActionsSection from './CardActionsSection';
import CardManageSection from './CardManageSection';
import type { CardHomeState, CardHomeFeatures } from '../CardHome.types';

interface CardHomeContentProps {
  /** Complete state from useCardHomeState hook */
  state: CardHomeState;
}

/**
 * CardHomeContent Component
 *
 * Main content wrapper for CardHome. Renders:
 * - Title
 * - Message boxes (warnings, KYC pending, provisioning)
 * - Card image with details
 * - Balance section
 * - Spending limit progress bar
 * - Action buttons
 * - Management options list
 */
const CardHomeContent = ({ state }: CardHomeContentProps) => {
  const tw = useTailwind();
  const theme = useTheme();

  const {
    viewState,
    priorityToken,
    cardDetails,
    assetBalance,
    cardDetailsToken,
    privacyMode,
    togglePrivacyMode,
    handleRefresh,
    isRefreshing,
    addFundsAction,
    changeAssetAction,
    manageSpendingLimitAction,
    viewCardDetailsAction,
    navigateToCardPage,
    navigateToTravelPage,
    navigateToCardTosPage,
    logoutAction,
    openOnboardingDelegationAction,
    dismissSpendingLimitWarning,
    isAuthenticated,
  } = state;

  // Determine if setup is needed
  const needsSetup = viewState.status === 'setup_required';
  const isKYCPending = viewState.status === 'kyc_pending';
  const isProvisioning =
    viewState.status === 'setup_required' && viewState.isProvisioning;

  // Get features (defaulting to minimal features for non-ready states)
  // Use isAuthenticated from state (available even during loading) for ToS/logout
  const features: CardHomeFeatures = useMemo(() => {
    if (viewState.status === 'ready') {
      return viewState.features;
    }
    // Default features for non-ready states (loading, kyc_pending, setup_required)
    // Use isAuthenticated from state so ToS/logout can show during loading
    return {
      isAuthenticated,
      isBaanxLoginEnabled: true,
      canViewCardDetails: false,
      canManageSpendingLimit: false,
      canChangeAsset: false,
      showSpendingLimitWarning: false,
      showSpendingLimitProgress: false,
      showAllowanceLimitedWarning: false,
      isSwapEnabled: false,
    };
  }, [viewState, isAuthenticated]);

  // Loading state (for card image and balance skeletons)
  // Show actual card image for setup states (kyc_pending, setup_required)
  const isLoading = viewState.status === 'loading';

  const {
    isLoading: isCardDetailsLoading,
    isImageLoading: isCardDetailsImageLoading,
    imageUrl: cardDetailsImageUrl,
    onImageLoad,
    onImageError,
  } = cardDetailsToken;

  return (
    <ScrollView
      style={tw.style('flex-1 bg-background-default')}
      showsVerticalScrollIndicator={false}
      alwaysBounceVertical={false}
      contentContainerStyle={tw.style('flex-grow pb-8')}
      testID={CardHomeSelectors.CARD_VIEW_TITLE}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[theme.colors.primary.default]}
          tintColor={theme.colors.icon.default}
        />
      }
    >
      <Text style={tw.style('px-4')} variant={TextVariant.HeadingLg}>
        {strings('card.card_home.title')}
      </Text>

      {/* Message boxes */}
      {features.showSpendingLimitWarning && (
        <CardMessageBox
          messageType={CardMessageBoxType.CloseSpendingLimit}
          onConfirm={manageSpendingLimitAction}
          onDismiss={dismissSpendingLimitWarning}
        />
      )}
      {isKYCPending && (
        <CardMessageBox messageType={CardMessageBoxType.KYCPending} />
      )}
      {isProvisioning && (
        <CardMessageBox messageType={CardMessageBoxType.CardProvisioning} />
      )}

      {/* Card section */}
      <Box twClassName="mt-4 bg-background-muted rounded-lg mx-4 py-4 px-4">
        {/* Card image */}
        <Box twClassName="w-full relative">
          {isLoading || isCardDetailsLoading ? (
            <Box
              twClassName="w-full rounded-xl overflow-hidden"
              style={{ aspectRatio: 851 / 540 }}
            >
              <Skeleton
                height={'100%'}
                width={'100%'}
                style={tw.style('rounded-xl')}
                testID={
                  isCardDetailsLoading
                    ? CardHomeSelectors.CARD_DETAILS_IMAGE_SKELETON
                    : undefined
                }
              />
            </Box>
          ) : cardDetailsImageUrl ? (
            <Box
              twClassName="w-full rounded-xl overflow-hidden"
              style={{ aspectRatio: 851 / 540 }}
            >
              {isCardDetailsImageLoading && (
                <Skeleton
                  height={'100%'}
                  width={'100%'}
                  style={tw.style('rounded-xl absolute inset-0 z-10')}
                  testID={CardHomeSelectors.CARD_DETAILS_IMAGE_SKELETON}
                />
              )}
              <Image
                source={{ uri: cardDetailsImageUrl }}
                style={tw.style('w-full h-full')}
                resizeMode="cover"
                onLoad={onImageLoad}
                onError={onImageError}
                testID={CardHomeSelectors.CARD_DETAILS_IMAGE}
              />
            </Box>
          ) : (
            <CardImage
              type={cardDetails?.type ?? CardType.VIRTUAL}
              status={cardDetails?.status ?? CardStatus.ACTIVE}
              address={priorityToken?.walletAddress}
            />
          )}
        </Box>

        {/* Balance section */}
        <CardBalanceSection
          isLoading={isLoading}
          needsSetup={needsSetup}
          isKYCPending={isKYCPending}
          privacyMode={privacyMode}
          assetBalance={assetBalance}
          onTogglePrivacyMode={togglePrivacyMode}
        />

        {/* Allowance limited warning (unauthenticated users) */}
        {features.showAllowanceLimitedWarning && (
          <Box twClassName="w-full">
            <Text>
              <Text
                variant={TextVariant.BodySm}
                twClassName="text-text-alternative"
              >
                {strings('card.card_home.limited_spending_warning')}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                twClassName="text-text-alternative font-bold"
              >
                {strings(
                  'card.card_home.manage_card_options.manage_spending_limit',
                )}
                {'.'}
              </Text>
            </Text>
          </Box>
        )}

        {/* Spending limit progress bar */}
        {features.showSpendingLimitProgress &&
          priorityToken?.allowanceState === AllowanceState.Limited && (
            <SpendingLimitProgressBar
              isLoading={isLoading}
              decimals={priorityToken?.decimals ?? 6}
              totalAllowance={priorityToken?.totalAllowance ?? '0'}
              remainingAllowance={priorityToken?.allowance ?? '0'}
              symbol={priorityToken?.symbol ?? ''}
            />
          )}

        {/* Action buttons */}
        <CardActionsSection
          viewState={viewState}
          isLoading={isLoading}
          isSwapEnabled={features.isSwapEnabled}
          onAddFunds={addFundsAction}
          onChangeAsset={changeAssetAction}
          onEnableCard={openOnboardingDelegationAction}
        />
      </Box>

      {/* Management options */}
      <CardManageSection
        features={features}
        needsSetup={needsSetup}
        isKYCPending={isKYCPending}
        isCardDetailsImageShowing={!!cardDetailsImageUrl}
        priorityToken={priorityToken}
        onViewCardDetails={viewCardDetailsAction}
        onManageSpendingLimit={manageSpendingLimitAction}
        onNavigateToCardPage={navigateToCardPage}
        onNavigateToTravelPage={navigateToTravelPage}
        onNavigateToCardTosPage={navigateToCardTosPage}
        onLogout={logoutAction}
      />
    </ScrollView>
  );
};

export default CardHomeContent;
