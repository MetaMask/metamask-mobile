import React, { ComponentClass } from 'react';
import useFavicon from './useFavicon';

const withFaviconAwareness =
  (
    Children: ComponentClass<{
      url: string;
    }>,
  ) =>
  (props: any) => {
    const { url } = props;
    const favicon = useFavicon(url);

    let faviconSource = favicon;
    if (typeof favicon === 'object' && favicon !== null) {
      faviconSource = favicon?.uri;
    }

    return <Children {...props} faviconSource={faviconSource} />;
  };

export default withFaviconAwareness;
