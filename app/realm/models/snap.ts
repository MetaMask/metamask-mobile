import Realm, { BSON } from 'realm';

class Snap extends Realm.Object<Snap, 'name' | 'sourceCode'> {
  name!: string;
  sourceCode!: string;
  createdAt: Date = new Date();

  static primaryKey = 'name';

  constructor(realm: Realm, name: string, sourceCode: string) {
    super(realm, { name, sourceCode });
  }
}

export default Snap;
