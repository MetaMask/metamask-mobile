import React, { useMemo, useRef, useState } from 'react';
import { ImageSourcePropType, StyleSheet, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { getUrlObj, prefixUrlWithProtocol } from '../../../util/browser';
import { strings } from '../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import Button from '../../../component-library/components/Buttons/Button/Button';
import Icon, {
  IconSize,
  IconName,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import Text from '../../../component-library/components/Texts/Text';
import TagUrl from '../../../component-library/components/Tags/TagUrl';
import { resetOriginSpamState } from '../../../core/redux/slices/originThrottling';

export const BLOCK_BUTTON_TEST_ID = 'block-dapp-button';
export const CONTINUE_BUTTON_TEST_ID = 'continue-dapp-button';

const createStyles = () =>
  StyleSheet.create({
    buttonsWrapper: {
      alignSelf: 'stretch',
      flexDirection: 'column',
      gap: 16,
      paddingTop: 24,
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
  setBlockDapp,
}: {
  onCloseModal: () => void;
  onResetOriginSpamState: () => void;
  origin: string;
  setBlockDapp: (value: boolean) => void;
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
      <SheetHeader title={strings('spam_filter.title')} />
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
          label={strings('spam_filter.cancel')}
          onPress={() => {
            onResetOriginSpamState();
            onCloseModal();
          }}
          size={ButtonSize.Lg}
          testID={CONTINUE_BUTTON_TEST_ID}
          variant={ButtonVariants.Secondary}
          width={ButtonWidthTypes.Full}
        />
        <Button
          label={strings('spam_filter.block_dapp_requests_for_1_minute')}
          onPress={() => {
            setBlockDapp(true);
          }}
          size={ButtonSize.Lg}
          testID={BLOCK_BUTTON_TEST_ID}
          variant={ButtonVariants.Primary}
          width={ButtonWidthTypes.Full}
        />
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
          label={strings('spam_filter.got_it')}
          onPress={() => {
            onCloseModal();
          }}
          size={ButtonSize.Lg}
          variant={ButtonVariants.Primary}
          width={ButtonWidthTypes.Full}
        />
      </View>
    </>
  );
};

const DappSpamModal = ({
  route,
}: {
  route: { params: { origin: string } };
}) => {
  const dispatch = useDispatch();
  const { origin } = route.params;
  const styles = createStyles();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [isBlockDappOptedIn, setBlockDapp] = useState(false);

  const onResetOriginSpamState = () => {
    dispatch(resetOriginSpamState(origin));
  };

  const onCloseModal = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  return (
    <BottomSheet ref={sheetRef} isInteractable={false}>
      <View style={styles.wrapper}>
        {isBlockDappOptedIn ? (
          <SiteBlockedContent onCloseModal={onCloseModal} />
        ) : (
          <MultipleRequestContent
            onCloseModal={onCloseModal}
            onResetOriginSpamState={onResetOriginSpamState}
            origin={origin}
            setBlockDapp={setBlockDapp}
          />
        )}
      </View>
    </BottomSheet>
  );
};

export default DappSpamModal;
