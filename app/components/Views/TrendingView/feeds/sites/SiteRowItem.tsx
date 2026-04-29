import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import SiteRowItemWrapper from '../../../../UI/Sites/components/SiteRowItemWrapper/SiteRowItemWrapper';
import type { SiteData } from '../../../../UI/Sites/components/SiteRowItem/SiteRowItem';
import { removeBookmark } from '../../../../../actions/bookmarks';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

interface SiteRowItemProps {
  site: SiteData;
}

/** Generic site row (sites + dapps_favorites without remove action). */
export const SiteRowItem: React.FC<SiteRowItemProps> = ({ site }) => {
  const navigation = useNavigation<AppNavigationProp>();
  return <SiteRowItemWrapper site={site} navigation={navigation} />;
};

/** Favorite-site row with the "remove from favorites" affordance. */
export const FavoriteSiteRowItem: React.FC<SiteRowItemProps> = ({ site }) => {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  return (
    <SiteRowItemWrapper
      site={site}
      navigation={navigation}
      onRemoveFavorite={() =>
        dispatch(removeBookmark({ url: site.url, name: site.name }))
      }
    />
  );
};
