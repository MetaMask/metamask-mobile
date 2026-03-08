import React, { useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  BackHandler,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import { selectRevocationSession } from '../../selectors';
import { clearRevocationSession } from '../../../../../core/redux/slices/tokenApprovals';
import { formatUsd } from '../../utils/formatUsd';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 100,
  },
  iconContainer: {
    marginBottom: 24,
  },
  countText: {
    marginTop: 0,
  },
  exposureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  description: {
    textAlign: 'center',
    marginTop: 16,
  },
  failureList: {
    marginTop: 24,
    width: '100%',
    gap: 8,
  },
  failureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  failureInfo: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
});

const RevokeResultScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const session = useSelector(selectRevocationSession);

  const isFullSuccess = session.failedCount === 0;
  const revokedCount = session.completedCount;
  const totalCount = session.totalApprovals;

  const handleDone = useCallback(() => {
    dispatch(clearRevocationSession());
    (
      navigation as StackNavigationProp<Record<string, undefined | object>>
    ).popToTop();
  }, [dispatch, navigation]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleDone();
        return true;
      },
    );
    return () => backHandler.remove();
  }, [handleDone]);

  const failedChains = session.chainProgress.filter(
    (c) => c.status === 'failed',
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.default }]}
    >
      {/* Header bar with title and X */}
      <View style={styles.headerBar}>
        <Text
          variant={TextVariant.HeadingSM}
          color={TextColor.Default}
          style={styles.headerTitle}
        >
          {isFullSuccess
            ? strings('token_approvals.result_success_title')
            : strings('token_approvals.result_partial_title')}
        </Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleDone}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon
            name={IconName.Close}
            size={IconSize.Md}
            color={IconColor.Default}
          />
        </TouchableOpacity>
      </View>

      {/* Centered content */}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon
            name={isFullSuccess ? IconName.Confirmation : IconName.Warning}
            size={IconSize.XXL}
            color={isFullSuccess ? IconColor.Success : IconColor.Warning}
          />
        </View>

        <Text
          variant={TextVariant.HeadingMD}
          color={TextColor.Default}
          style={styles.countText}
        >
          {revokedCount === 1
            ? strings('token_approvals.result_single_revoked')
            : strings('token_approvals.result_approvals_revoked', {
                count: revokedCount.toString(),
              })}
        </Text>

        {session.revokedExposureUsd > 0 && (
          <View style={styles.exposureRow}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('token_approvals.result_exposure_label')}:{' '}
            </Text>
            <Text variant={TextVariant.BodyMDBold} color={TextColor.Success}>
              {formatUsd(session.revokedExposureUsd)}
            </Text>
          </View>
        )}

        <Text
          variant={TextVariant.BodySM}
          color={TextColor.Alternative}
          style={styles.description}
        >
          {isFullSuccess
            ? strings('token_approvals.result_success_description')
            : strings('token_approvals.result_partial_description', {
                completed: revokedCount.toString(),
                total: totalCount.toString(),
              })}
        </Text>

        {/* Per-chain failure details */}
        {failedChains.length > 0 && (
          <View style={styles.failureList}>
            {failedChains.map((chain) => (
              <View
                key={chain.chainId}
                style={[
                  styles.failureRow,
                  { backgroundColor: colors.error.muted },
                ]}
              >
                <Icon
                  name={IconName.Danger}
                  size={IconSize.Sm}
                  color={IconColor.Error}
                />
                <View style={styles.failureInfo}>
                  <Text
                    variant={TextVariant.BodySMBold}
                    color={TextColor.Default}
                  >
                    {chain.chainName}
                  </Text>
                  <Text variant={TextVariant.BodyXS} color={TextColor.Error}>
                    {chain.error ??
                      strings('token_approvals.processing_status_failed')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Footer button */}
      <View style={styles.footer}>
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          label={strings('token_approvals.result_done_button')}
          onPress={handleDone}
          width={ButtonWidthTypes.Full}
        />
      </View>
    </SafeAreaView>
  );
};

export default RevokeResultScreen;
