import React, { useCallback, useMemo, useRef, useState } from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import { ImageSourcePropType, StyleSheet, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { getUrlObj, prefixUrlWithProtocol } from '../../../util/browser';
import { strings } from '../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import Icon, {
  IconSize,
  IconName,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import TagUrl from '../../../component-library/components/Tags/TagUrl';
import { resetOriginSpamState } from '../../../core/redux/slices/originThrottling';
import {
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';

export const BLOCK_BUTTON_TEST_ID = 'block-origin-button';
export const CONTINUE_BUTTON_TEST_ID = 'continue-origin-button';

const createStyles = () =>
  StyleSheet.create({
    buttonsWrapper: {
      alignSelf: 'stretch',
      flexDirection: 'column',
      gap: 16,
      paddingTop: 24,
    },
    titleWrapper: {
      flexDirection: 'row',
      marginBottom: 16,
      marginTop: 16,
    },
    title: {
      flex: 1,
      flexWrap: 'wrap',
      textAlign: 'center',
    },
    wrapper: {
      alignItems: 'center',
      padding: 16,
    },
    tagWrapper: {
      marginBottom: 16,
    },
    description: {
      textAlign: 'center',
    },
  });

const MultipleRequestContent = ({
  onCloseModal,
  onResetOriginSpamState,
  origin,
  setBlockOrigin,
}: {
  onCloseModal: () => void;
  onResetOriginSpamState: () => void;
  origin: string;
  setBlockOrigin: (value: boolean) => void;
}) => {
  const styles = createStyles();

  const favicon: ImageSourcePropType = useMemo(() => {
    const iconUrl = `https://api.faviconkit.com/${origin}/50`;
    return { uri: iconUrl };
  }, [origin]);

  const urlWithProtocol = prefixUrlWithProtocol(origin);

  const secureIcon = useMemo(
    () =>
      getUrlObj(origin).protocol === 'https:'
        ? IconName.Lock
        : IconName.LockSlash,
    [origin],
  );

  return (
    <>
      <Icon
        color={IconColor.Warning}
        name={IconName.Danger}
        size={IconSize.Xl}
      />
      <View style={styles.titleWrapper}>
        <Text style={styles.title} variant={TextVariant.HeadingMd}>
          {strings('spam_filter.title')}
        </Text>
      </View>
      <View style={styles.tagWrapper}>
        <TagUrl
          imageSource={favicon}
          label={urlWithProtocol}
          iconName={secureIcon}
        />
      </View>
      <Text style={styles.description}>
        {strings('spam_filter.description')}
      </Text>
      <View style={styles.buttonsWrapper}>
        <Button
          onPress={() => {
            onResetOriginSpamState();
            onCloseModal();
          }}
          size={ButtonSize.Lg}
          testID={CONTINUE_BUTTON_TEST_ID}
          variant={ButtonVariant.Secondary}
          isFullWidth
        >
          {strings('spam_filter.cancel')}
        </Button>
        <Button
          onPress={() => {
            setBlockOrigin(true);
          }}
          size={ButtonSize.Lg}
          testID={BLOCK_BUTTON_TEST_ID}
          variant={ButtonVariant.Primary}
          isFullWidth
        >
          {strings('spam_filter.block_origin_requests_for_1_minute')}
        </Button>
      </View>
    </>
  );
};

const SiteBlockedContent = ({ onCloseModal }: { onCloseModal: () => void }) => {
  const styles = createStyles();
  return (
    <>
      <Icon
        color={IconColor.Success}
        name={IconName.Confirmation}
        size={IconSize.Xl}
      />
      <SheetHeader title={strings('spam_filter.site_blocked_title')} />
      <Text>{strings('spam_filter.site_blocked_description')}</Text>
      <View style={styles.buttonsWrapper}>
        <Button
          onPress={() => {
            onCloseModal();
          }}
          size={ButtonSize.Lg}
          variant={ButtonVariant.Primary}
          isFullWidth
        >
          {strings('spam_filter.got_it')}
        </Button>
      </View>
    </>
  );
};

interface OriginSpamModalRouteParams {
  origin: string;
}

const OriginSpamModal = () => {
  const route =
    useRoute<RouteProp<{ params: OriginSpamModalRouteParams }, 'params'>>();
  const dispatch = useDispatch();
  const { origin } = route.params;
  const styles = createStyles();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [isBlockOriginOptedIn, setBlockOrigin] = useState(false);

  const handleCloseModal = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  const handleResetOriginSpamState = useCallback(() => {
    if (isBlockOriginOptedIn) {
      handleCloseModal();
      return;
    }
    dispatch(resetOriginSpamState(origin));
  }, [isBlockOriginOptedIn, dispatch, origin]);

  return (
    <BottomSheet
      isInteractable
      onClose={handleResetOriginSpamState}
      ref={sheetRef}
    >
      <View style={styles.wrapper}>
        {isBlockOriginOptedIn ? (
          <SiteBlockedContent onCloseModal={handleCloseModal} />
        ) : (
          <MultipleRequestContent
            onCloseModal={handleCloseModal}
            onResetOriginSpamState={handleResetOriginSpamState}
            origin={origin}
            setBlockOrigin={setBlockOrigin}
          />
        )}
      </View>
    </BottomSheet>
  );
};

export default OriginSpamModal;
