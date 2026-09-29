import {
  GachaController,
  type GachaControllerMessenger,
} from '../../../../components/UI/Gacha/controllers/GachaController';
import type { MessengerClientInitFunction } from '../../types';

/** Initializes the Gacha controller in Engine. */
export const gachaControllerInit: MessengerClientInitFunction<
  GachaController,
  GachaControllerMessenger
> = ({ controllerMessenger }) => ({
  controller: new GachaController({
    messenger: controllerMessenger,
  }),
});
