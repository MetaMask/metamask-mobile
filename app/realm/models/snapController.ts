import Realm, { ObjectSchema } from 'realm';
import { PersistedSnapControllerState } from '@metamask/snaps-controllers';

// Define the embedded object for SnapControllerState
// class SnapControllerState extends Realm.Object {
//   static schema: ObjectSchema = {
//     name: 'SnapControllerState',
//     embedded: true,
//     properties: {
//       // Add properties based on PersistedSnapControllerState structure
//       // This will be populated with the actual state data
//     },
//   };
// }

class SnapController extends Realm.Object {
  id!: string;
  snapState!: PersistedSnapControllerState;
  createdAt: Date = new Date();

  static schema: ObjectSchema = {
    name: 'SnapController',
    primaryKey: 'id',
    properties: {
      id: 'string',
      snapState: 'mixed',
      createdAt: 'date',
    },
  };
}

export default SnapController;
