import React, { ComponentClass } from 'react';
import useFavicon from './useFavicon';
import { ImageURISource } from 'react-native';

const withFaviconAwareness =
  (
    Children: ComponentClass<{
      url: string;
    }>,
  ) =>
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (props: any) => {
    const { url } = props;
    const favicon = useFavicon(url);

    let faviconSource;
    if (
      typeof favicon === 'object' &&
      favicon !== null &&
      !Array.isArray(favicon)
    ) {
      faviconSource = (favicon as ImageURISource).uri;
    }

    return <Children {...props} {...(faviconSource && { faviconSource })} />;
  };

export default withFaviconAwareness;
