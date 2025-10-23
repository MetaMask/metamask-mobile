import { PropsWithChildren, useState, useEffect } from 'react';
import { RealmProvider, Realm } from '@realm/react';

import RealmService from './service';
import schemas from './models/';

export default ({ children }: PropsWithChildren) => {
  const [realmInstance, setRealmInstance] = useState<Realm | null>(null);

  useEffect(() => {
    if (realmInstance) return;

    try {
      const config: Realm.Configuration = { schema: schemas };
      // __DEV__ && Realm.deleteFile(config);
      const realm = new Realm(config);
      Realm.setLogLevel('trace');
      RealmService.instance = realm;
      setRealmInstance(realm);
    } catch (error) {
      console.error('Failed to initialize Realm:', error);
    }
  });

  return realmInstance ? (
    <RealmProvider realm={realmInstance}>{children}</RealmProvider>
  ) : (
    <>{children}</>
  );
};
