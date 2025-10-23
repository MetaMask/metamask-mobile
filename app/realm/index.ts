import Realm from 'realm';
import schemas from './models/';

import RealmService from './RealmService';

const config: Realm.Configuration = { schema: schemas };
const realm = new Realm(config);

function setup() {
  RealmService.instance = realm;
}
