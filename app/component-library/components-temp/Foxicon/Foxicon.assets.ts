import { AssetByFoxiconVariant, FoxiconVariant } from './Foxicon.types';
import agentSVG from './assets/agent.svg';
import angelSVG from './assets/angel.svg';
import astroSVG from './assets/astro.svg';
import baseSVG from './assets/base.svg';
import cannibalSVG from './assets/cannibal.svg';
import cyborgSVG from './assets/cyborg.svg';
import frozenSVG from './assets/frozen.svg';
import gentlemanSVG from './assets/gentleman.svg';
import gothSVG from './assets/goth.svg';
import nerdSVG from './assets/nerd.svg';
import pirateSVG from './assets/pirate.svg';
import royalSVG from './assets/royal.svg';
import superheroSVG from './assets/superhero.svg';
import vrSVG from './assets/vr.svg';
import zombieSVG from './assets/zombie.svg';

export const assetByFoxiconVariant: AssetByFoxiconVariant = {
  [FoxiconVariant.Agent]: agentSVG,
  [FoxiconVariant.Angel]: angelSVG,
  [FoxiconVariant.Astro]: astroSVG,
  [FoxiconVariant.Base]: baseSVG,
  [FoxiconVariant.Cannibal]: cannibalSVG,
  [FoxiconVariant.Cyborg]: cyborgSVG,
  [FoxiconVariant.Frozen]: frozenSVG,
  [FoxiconVariant.Gentleman]: gentlemanSVG,
  [FoxiconVariant.Goth]: gothSVG,
  [FoxiconVariant.Nerd]: nerdSVG,
  [FoxiconVariant.Pirate]: pirateSVG,
  [FoxiconVariant.Royal]: royalSVG,
  [FoxiconVariant.Superhero]: superheroSVG,
  [FoxiconVariant.Vr]: vrSVG,
  [FoxiconVariant.Zombie]: zombieSVG,
};
