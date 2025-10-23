import Realm, { BSON } from 'realm';

class Snap extends Realm.Object<Snap, 'sourceCode'> {
  _id: BSON.ObjectId = new BSON.ObjectId();
  sourceCode!: string;
  createdAt: Date = new Date();

  static primaryKey = '_id';

  constructor(realm: Realm, sourceCode: string) {
    super(realm, { sourceCode });
  }
}

export default Snap;
