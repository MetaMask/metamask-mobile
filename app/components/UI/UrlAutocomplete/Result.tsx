import React, { memo, useCallback } from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { useTheme } from '../../../util/theme';
import { getHost } from '../../../util/browser';
import WebsiteIcon from '../WebsiteIcon';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import { deleteFavoriteTestId } from '../../../../wdio/screen-objects/testIDs/BrowserScreen/UrlAutocomplete.testIds';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { useDispatch } from 'react-redux';
import { removeBookmark } from '../../../actions/bookmarks';
import stylesheet from './styles';

interface ResultProps {
    result: {
        url: string;
        name: string;
        type: string;
    };
    onPress: () => void;
}

export const Result: React.FC<ResultProps> = memo(({ result, onPress }) => {
    const theme = useTheme();
    const styles = stylesheet({theme});

    const name = typeof result.name === 'string' ? result.name : getHost(result.url);

    const dispatch = useDispatch();

    const onPressRemove = useCallback(() => {
        dispatch(removeBookmark(result));
    }, [dispatch, result]);

    return (
      <TouchableOpacity
        style={styles.item}
        onPress={onPress}
      >
        <View style={styles.itemWrapper}>
          <WebsiteIcon
            style={styles.bookmarkIco}
            url={result.url}
            title={name}
            textStyle={styles.fallbackTextStyle}
          />
          <View style={styles.textContent}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.url} numberOfLines={1}>
              {result.url}
            </Text>
          </View>
          {
            result.type === 'favorites' && (
              <ButtonIcon
                testID={deleteFavoriteTestId(result.url)}
                style={styles.deleteFavorite}
                iconName={IconName.Trash}
                onPress={onPressRemove}
              />
            )
          }
        </View>
      </TouchableOpacity>
    );
});
