import Realm, { BSON } from 'realm';

class Snap extends Realm.Object<Snap, 'name' | 'sourceCode'> {
  _id: BSON.ObjectId = new BSON.ObjectId();
  name!: string;
  sourceCode!: string;
  createdAt: Date = new Date();

  static primaryKey = '_id';

  constructor(realm: Realm, name: string, sourceCode: string) {
    super(realm, { name, sourceCode });
  }
}

export default Snap;
