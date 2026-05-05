import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import SiteRowItemBase, {
  bookmarkUrlForRemoval,
  type SiteData,
} from '../../../../UI/Sites/components/SiteRowItem/SiteRowItem';
import Routes from '../../../../../constants/navigation/Routes';
import { removeBookmark } from '../../../../../actions/bookmarks';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

const openSiteInBrowser = (navigation: AppNavigationProp, site: SiteData) => {
  navigation.navigate(Routes.BROWSER.HOME, {
    screen: Routes.BROWSER.VIEW,
    params: {
      newTabUrl: site.url,
      timestamp: Date.now(),
      fromTrending: true,
    },
  });
};

interface SiteRowItemProps {
  site: SiteData;
  /** Called synchronously before the default press handler fires. */
  onBeforePress?: () => void;
}

/** Generic site row (sites + dapps_favorites without remove action). */
export const SiteRowItem: React.FC<SiteRowItemProps> = ({
  site,
  onBeforePress,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  return (
    <SiteRowItemBase
      site={site}
      onPress={() => {
        onBeforePress?.();
        openSiteInBrowser(navigation, site);
      }}
    />
  );
};

/** Favorite-site row with the "remove from favorites" affordance. */
export const FavoriteSiteRowItem: React.FC<SiteRowItemProps> = ({
  site,
  onBeforePress,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  return (
    <SiteRowItemBase
      site={site}
      onPress={() => {
        onBeforePress?.();
        openSiteInBrowser(navigation, site);
      }}
      onRemoveFavorite={() =>
        dispatch(
          removeBookmark({
            url: bookmarkUrlForRemoval(site),
            name: site.name,
          }),
        )
      }
    />
  );
};
