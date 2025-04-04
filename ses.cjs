// ses@1.5.0
'use strict';
(() => {
  const functors = [
// === functors[0] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   $h‍_imports([]);   /* global globalThis */
/* eslint-disable no-restricted-globals */

/**
 * commons.js
 * Declare shorthand functions. Sharing these declarations across modules
 * improves on consistency and minification. Unused declarations are
 * dropped by the tree shaking process.
 *
 * We capture these, not just for brevity, but for security. If any code
 * modifies Object to change what 'assign' points to, the Compartment shim
 * would be corrupted.
 */

// We cannot use globalThis as the local name since it would capture the
// lexical name.
const universalThis=  globalThis;$h‍_once.universalThis(universalThis);


const        {
  Array,
  Date,
  FinalizationRegistry,
  Float32Array,
  JSON,
  Map,
  Math,
  Number,
  Object,
  Promise,
  Proxy,
  Reflect,
  RegExp: FERAL_REG_EXP,
  Set,
  String,
  Symbol,
  WeakMap,
  WeakSet}=
    globalThis;$h‍_once.Array(Array);$h‍_once.Date(Date);$h‍_once.FinalizationRegistry(FinalizationRegistry);$h‍_once.Float32Array(Float32Array);$h‍_once.JSON(JSON);$h‍_once.Map(Map);$h‍_once.Math(Math);$h‍_once.Number(Number);$h‍_once.Object(Object);$h‍_once.Promise(Promise);$h‍_once.Proxy(Proxy);$h‍_once.Reflect(Reflect);$h‍_once.FERAL_REG_EXP(FERAL_REG_EXP);$h‍_once.Set(Set);$h‍_once.String(String);$h‍_once.Symbol(Symbol);$h‍_once.WeakMap(WeakMap);$h‍_once.WeakSet(WeakSet);

const        {
  // The feral Error constructor is safe for internal use, but must not be
  // revealed to post-lockdown code in any compartment including the start
  // compartment since in V8 at least it bears stack inspection capabilities.
  Error: FERAL_ERROR,
  RangeError,
  ReferenceError,
  SyntaxError,
  TypeError,
  AggregateError}=
    globalThis;$h‍_once.FERAL_ERROR(FERAL_ERROR);$h‍_once.RangeError(RangeError);$h‍_once.ReferenceError(ReferenceError);$h‍_once.SyntaxError(SyntaxError);$h‍_once.TypeError(TypeError);$h‍_once.AggregateError(AggregateError);

const        {
  assign,
  create,
  defineProperties,
  entries,
  freeze,
  getOwnPropertyDescriptor,
  getOwnPropertyDescriptors,
  getOwnPropertyNames,
  getPrototypeOf,
  is,
  isFrozen,
  isSealed,
  isExtensible,
  keys,
  prototype: objectPrototype,
  seal,
  preventExtensions,
  setPrototypeOf,
  values,
  fromEntries}=
    Object;$h‍_once.assign(assign);$h‍_once.create(create);$h‍_once.defineProperties(defineProperties);$h‍_once.entries(entries);$h‍_once.freeze(freeze);$h‍_once.getOwnPropertyDescriptor(getOwnPropertyDescriptor);$h‍_once.getOwnPropertyDescriptors(getOwnPropertyDescriptors);$h‍_once.getOwnPropertyNames(getOwnPropertyNames);$h‍_once.getPrototypeOf(getPrototypeOf);$h‍_once.is(is);$h‍_once.isFrozen(isFrozen);$h‍_once.isSealed(isSealed);$h‍_once.isExtensible(isExtensible);$h‍_once.keys(keys);$h‍_once.objectPrototype(objectPrototype);$h‍_once.seal(seal);$h‍_once.preventExtensions(preventExtensions);$h‍_once.setPrototypeOf(setPrototypeOf);$h‍_once.values(values);$h‍_once.fromEntries(fromEntries);

const        {
  species: speciesSymbol,
  toStringTag: toStringTagSymbol,
  iterator: iteratorSymbol,
  matchAll: matchAllSymbol,
  unscopables: unscopablesSymbol,
  keyFor: symbolKeyFor,
  for: symbolFor}=
    Symbol;$h‍_once.speciesSymbol(speciesSymbol);$h‍_once.toStringTagSymbol(toStringTagSymbol);$h‍_once.iteratorSymbol(iteratorSymbol);$h‍_once.matchAllSymbol(matchAllSymbol);$h‍_once.unscopablesSymbol(unscopablesSymbol);$h‍_once.symbolKeyFor(symbolKeyFor);$h‍_once.symbolFor(symbolFor);

const        { isInteger}=   Number;$h‍_once.isInteger(isInteger);

const        { stringify: stringifyJson}=   JSON;

// Needed only for the Safari bug workaround below
$h‍_once.stringifyJson(stringifyJson);const{defineProperty:originalDefineProperty}=Object;

const        defineProperty=  (object, prop, descriptor)=>  {
  // We used to do the following, until we had to reopen Safari bug
  // https://bugs.webkit.org/show_bug.cgi?id=222538#c17
  // Once this is fixed, we may restore it.
  // // Object.defineProperty is allowed to fail silently so we use
  // // Object.defineProperties instead.
  // return defineProperties(object, { [prop]: descriptor });

  // Instead, to workaround the Safari bug
  const result=  originalDefineProperty(object, prop, descriptor);
  if( result!==  object) {
    // See https://github.com/endojs/endo/blob/master/packages/ses/error-codes/SES_DEFINE_PROPERTY_FAILED_SILENTLY.md
    throw TypeError(
       `Please report that the original defineProperty silently failed to set ${stringifyJson(
        String(prop))
        }. (SES_DEFINE_PROPERTY_FAILED_SILENTLY)`);

   }
  return result;
 };$h‍_once.defineProperty(defineProperty);

const        {
  apply,
  construct,
  get: reflectGet,
  getOwnPropertyDescriptor: reflectGetOwnPropertyDescriptor,
  has: reflectHas,
  isExtensible: reflectIsExtensible,
  ownKeys,
  preventExtensions: reflectPreventExtensions,
  set: reflectSet}=
    Reflect;$h‍_once.apply(apply);$h‍_once.construct(construct);$h‍_once.reflectGet(reflectGet);$h‍_once.reflectGetOwnPropertyDescriptor(reflectGetOwnPropertyDescriptor);$h‍_once.reflectHas(reflectHas);$h‍_once.reflectIsExtensible(reflectIsExtensible);$h‍_once.ownKeys(ownKeys);$h‍_once.reflectPreventExtensions(reflectPreventExtensions);$h‍_once.reflectSet(reflectSet);

const        { isArray, prototype: arrayPrototype}=   Array;$h‍_once.isArray(isArray);$h‍_once.arrayPrototype(arrayPrototype);
const        { prototype: mapPrototype}=   Map;$h‍_once.mapPrototype(mapPrototype);
const        { revocable: proxyRevocable}=   Proxy;$h‍_once.proxyRevocable(proxyRevocable);
const        { prototype: regexpPrototype}=   RegExp;$h‍_once.regexpPrototype(regexpPrototype);
const        { prototype: setPrototype}=   Set;$h‍_once.setPrototype(setPrototype);
const        { prototype: stringPrototype}=   String;$h‍_once.stringPrototype(stringPrototype);
const        { prototype: weakmapPrototype}=   WeakMap;$h‍_once.weakmapPrototype(weakmapPrototype);
const        { prototype: weaksetPrototype}=   WeakSet;$h‍_once.weaksetPrototype(weaksetPrototype);
const        { prototype: functionPrototype}=   Function;$h‍_once.functionPrototype(functionPrototype);
const        { prototype: promisePrototype}=   Promise;$h‍_once.promisePrototype(promisePrototype);
const        { prototype: generatorPrototype}=   getPrototypeOf(
  // eslint-disable-next-line no-empty-function, func-names
  function*()  { });$h‍_once.generatorPrototype(generatorPrototype);


const        typedArrayPrototype=  getPrototypeOf(Uint8Array.prototype);$h‍_once.typedArrayPrototype(typedArrayPrototype);

const { bind}=   functionPrototype;

/**
 * uncurryThis()
 * Equivalent of: fn => (thisArg, ...args) => apply(fn, thisArg, args)
 *
 * See those reference for a complete explanation:
 * http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
 * which only lives at
 * http://web.archive.org/web/20160805225710/http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
 *
 * @type {<F extends (this: any, ...args: any[]) => any>(fn: F) => ((thisArg: ThisParameterType<F>, ...args: Parameters<F>) => ReturnType<F>)}
 */
const        uncurryThis=  bind.bind(bind.call); // eslint-disable-line @endo/no-polymorphic-call
$h‍_once.uncurryThis(uncurryThis);
const        objectHasOwnProperty=  uncurryThis(objectPrototype.hasOwnProperty);
//
$h‍_once.objectHasOwnProperty(objectHasOwnProperty);const arrayFilter=uncurryThis(arrayPrototype.filter);$h‍_once.arrayFilter(arrayFilter);
const        arrayForEach=  uncurryThis(arrayPrototype.forEach);$h‍_once.arrayForEach(arrayForEach);
const        arrayIncludes=  uncurryThis(arrayPrototype.includes);$h‍_once.arrayIncludes(arrayIncludes);
const        arrayJoin=  uncurryThis(arrayPrototype.join);
/** @type {<T, U>(thisArg: readonly T[], callbackfn: (value: T, index: number, array: T[]) => U, cbThisArg?: any) => U[]} */$h‍_once.arrayJoin(arrayJoin);
const        arrayMap=  /** @type {any} */  uncurryThis(arrayPrototype.map);$h‍_once.arrayMap(arrayMap);
const        arrayFlatMap=  /** @type {any} */
  uncurryThis(arrayPrototype.flatMap);$h‍_once.arrayFlatMap(arrayFlatMap);

const        arrayPop=  uncurryThis(arrayPrototype.pop);
/** @type {<T>(thisArg: T[], ...items: T[]) => number} */$h‍_once.arrayPop(arrayPop);
const        arrayPush=  uncurryThis(arrayPrototype.push);$h‍_once.arrayPush(arrayPush);
const        arraySlice=  uncurryThis(arrayPrototype.slice);$h‍_once.arraySlice(arraySlice);
const        arraySome=  uncurryThis(arrayPrototype.some);$h‍_once.arraySome(arraySome);
const        arraySort=  uncurryThis(arrayPrototype.sort);$h‍_once.arraySort(arraySort);
const        iterateArray=  uncurryThis(arrayPrototype[iteratorSymbol]);
//
$h‍_once.iterateArray(iterateArray);const mapSet=uncurryThis(mapPrototype.set);$h‍_once.mapSet(mapSet);
const        mapGet=  uncurryThis(mapPrototype.get);$h‍_once.mapGet(mapGet);
const        mapHas=  uncurryThis(mapPrototype.has);$h‍_once.mapHas(mapHas);
const        mapDelete=  uncurryThis(mapPrototype.delete);$h‍_once.mapDelete(mapDelete);
const        mapEntries=  uncurryThis(mapPrototype.entries);$h‍_once.mapEntries(mapEntries);
const        iterateMap=  uncurryThis(mapPrototype[iteratorSymbol]);
//
$h‍_once.iterateMap(iterateMap);const setAdd=uncurryThis(setPrototype.add);$h‍_once.setAdd(setAdd);
const        setDelete=  uncurryThis(setPrototype.delete);$h‍_once.setDelete(setDelete);
const        setForEach=  uncurryThis(setPrototype.forEach);$h‍_once.setForEach(setForEach);
const        setHas=  uncurryThis(setPrototype.has);$h‍_once.setHas(setHas);
const        iterateSet=  uncurryThis(setPrototype[iteratorSymbol]);
//
$h‍_once.iterateSet(iterateSet);const regexpTest=uncurryThis(regexpPrototype.test);$h‍_once.regexpTest(regexpTest);
const        regexpExec=  uncurryThis(regexpPrototype.exec);$h‍_once.regexpExec(regexpExec);
const        matchAllRegExp=  uncurryThis(regexpPrototype[matchAllSymbol]);
//
$h‍_once.matchAllRegExp(matchAllRegExp);const stringEndsWith=uncurryThis(stringPrototype.endsWith);$h‍_once.stringEndsWith(stringEndsWith);
const        stringIncludes=  uncurryThis(stringPrototype.includes);$h‍_once.stringIncludes(stringIncludes);
const        stringIndexOf=  uncurryThis(stringPrototype.indexOf);$h‍_once.stringIndexOf(stringIndexOf);
const        stringMatch=  uncurryThis(stringPrototype.match);$h‍_once.stringMatch(stringMatch);
const        generatorNext=  uncurryThis(generatorPrototype.next);$h‍_once.generatorNext(generatorNext);
const        generatorThrow=  uncurryThis(generatorPrototype.throw);

/**
 * @type { &
 *   ((thisArg: string, searchValue: { [Symbol.replace](string: string, replaceValue: string): string; }, replaceValue: string) => string) &
 *   ((thisArg: string, searchValue: { [Symbol.replace](string: string, replacer: (substring: string, ...args: any[]) => string): string; }, replacer: (substring: string, ...args: any[]) => string) => string)
 * }
 */$h‍_once.generatorThrow(generatorThrow);
const        stringReplace=  /** @type {any} */
  uncurryThis(stringPrototype.replace);$h‍_once.stringReplace(stringReplace);

const        stringSearch=  uncurryThis(stringPrototype.search);$h‍_once.stringSearch(stringSearch);
const        stringSlice=  uncurryThis(stringPrototype.slice);
/** @type {(thisArg: string, splitter: string | RegExp | { [Symbol.split](string: string, limit?: number): string[]; }, limit?: number) => string[]} */$h‍_once.stringSlice(stringSlice);
const        stringSplit=  uncurryThis(stringPrototype.split);$h‍_once.stringSplit(stringSplit);
const        stringStartsWith=  uncurryThis(stringPrototype.startsWith);$h‍_once.stringStartsWith(stringStartsWith);
const        iterateString=  uncurryThis(stringPrototype[iteratorSymbol]);
//
$h‍_once.iterateString(iterateString);const weakmapDelete=uncurryThis(weakmapPrototype.delete);
/** @type {<K extends {}, V>(thisArg: WeakMap<K, V>, ...args: Parameters<WeakMap<K,V>['get']>) => ReturnType<WeakMap<K,V>['get']>} */$h‍_once.weakmapDelete(weakmapDelete);
const        weakmapGet=  uncurryThis(weakmapPrototype.get);$h‍_once.weakmapGet(weakmapGet);
const        weakmapHas=  uncurryThis(weakmapPrototype.has);$h‍_once.weakmapHas(weakmapHas);
const        weakmapSet=  uncurryThis(weakmapPrototype.set);
//
$h‍_once.weakmapSet(weakmapSet);const weaksetAdd=uncurryThis(weaksetPrototype.add);$h‍_once.weaksetAdd(weaksetAdd);
const        weaksetHas=  uncurryThis(weaksetPrototype.has);
//
$h‍_once.weaksetHas(weaksetHas);const functionToString=uncurryThis(functionPrototype.toString);$h‍_once.functionToString(functionToString);
const        functionBind=  uncurryThis(bind);
//
$h‍_once.functionBind(functionBind);const{all}=Promise;
const        promiseAll=  (promises)=>apply(all, Promise, [promises]);$h‍_once.promiseAll(promiseAll);
const        promiseCatch=  uncurryThis(promisePrototype.catch);
/** @type {<T, TResult1 = T, TResult2 = never>(thisArg: T, onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null) => Promise<TResult1 | TResult2>} */$h‍_once.promiseCatch(promiseCatch);
const        promiseThen=  /** @type {any} */
  uncurryThis(promisePrototype.then);

//
$h‍_once.promiseThen(promiseThen);const finalizationRegistryRegister=
  FinalizationRegistry&&  uncurryThis(FinalizationRegistry.prototype.register);$h‍_once.finalizationRegistryRegister(finalizationRegistryRegister);
const        finalizationRegistryUnregister=
  FinalizationRegistry&&
  uncurryThis(FinalizationRegistry.prototype.unregister);

/**
 * getConstructorOf()
 * Return the constructor from an instance.
 *
 * @param {Function} fn
 */$h‍_once.finalizationRegistryUnregister(finalizationRegistryUnregister);
const        getConstructorOf=  (fn)=>
  reflectGet(getPrototypeOf(fn), 'constructor');

/**
 * immutableObject
 * An immutable (frozen) empty object that is safe to share.
 */$h‍_once.getConstructorOf(getConstructorOf);
const        immutableObject=  freeze(create(null));

/**
 * isObject tests whether a value is an object.
 * Today, this is equivalent to:
 *
 *   const isObject = value => {
 *     if (value === null) return false;
 *     const type = typeof value;
 *     return type === 'object' || type === 'function';
 *   };
 *
 * But this is not safe in the face of possible evolution of the language, for
 * example new types or semantics of records and tuples.
 * We use this implementation despite the unnecessary allocation implied by
 * attempting to box a primitive.
 *
 * @param {any} value
 */$h‍_once.immutableObject(immutableObject);
const        isObject=  (value)=>Object(value)===  value;

/**
 * isError tests whether an object inherits from the intrinsic
 * `Error.prototype`.
 * We capture the original error constructor as FERAL_ERROR to provide a clear
 * signal for reviewers that we are handling an object with excess authority,
 * like stack trace inspection, that we are carefully hiding from client code.
 * Checking instanceof happens to be safe, but to avoid uttering FERAL_ERROR
 * for such a trivial case outside commons.js, we provide a utility function.
 *
 * @param {any} value
 */$h‍_once.isObject(isObject);
const        isError=  (value)=>value instanceof FERAL_ERROR;

// The original unsafe untamed eval function, which must not escape.
// Sample at module initialization time, which is before lockdown can
// repair it.  Use it only to build powerless abstractions.
// eslint-disable-next-line no-eval
$h‍_once.isError(isError);const FERAL_EVAL=eval;

// The original unsafe untamed Function constructor, which must not escape.
// Sample at module initialization time, which is before lockdown can
// repair it.  Use it only to build powerless abstractions.
$h‍_once.FERAL_EVAL(FERAL_EVAL);const FERAL_FUNCTION=Function;$h‍_once.FERAL_FUNCTION(FERAL_FUNCTION);

const        noEvalEvaluate=  ()=>  {
  // See https://github.com/endojs/endo/blob/master/packages/ses/error-codes/SES_NO_EVAL.md
  throw TypeError('Cannot eval with evalTaming set to "noEval" (SES_NO_EVAL)');
 };

// ////////////////// FERAL_STACK_GETTER FERAL_STACK_SETTER ////////////////////
$h‍_once.noEvalEvaluate(noEvalEvaluate);
const er1StackDesc=  getOwnPropertyDescriptor(Error('er1'), 'stack');
const er2StackDesc=  getOwnPropertyDescriptor(TypeError('er2'), 'stack');

let feralStackGetter;
let feralStackSetter;
if( er1StackDesc&&  er2StackDesc&&  er1StackDesc.get) {
  // We should only encounter this case on v8 because of its problematic
  // error own stack accessor behavior.
  // Note that FF/SpiderMonkey, Moddable/XS, and the error stack proposal
  // all inherit a stack accessor property from Error.prototype, which is
  // great. That case needs no heroics to secure.
  if(
    // In the v8 case as we understand it, all errors have an own stack
    // accessor property, but within the same realm, all these accessor
    // properties have the same getter and have the same setter.
    // This is therefore the case that we repair.
    typeof er1StackDesc.get===  'function'&&
    er1StackDesc.get===  er2StackDesc.get&&
    typeof er1StackDesc.set===  'function'&&
    er1StackDesc.set===  er2StackDesc.set)
    {
    // Otherwise, we have own stack accessor properties that are outside
    // our expectations, that therefore need to be understood better
    // before we know how to repair them.
    feralStackGetter=  freeze(er1StackDesc.get);
    feralStackSetter=  freeze(er1StackDesc.set);
   }else {
    // See https://github.com/endojs/endo/blob/master/packages/ses/error-codes/SES_UNEXPECTED_ERROR_OWN_STACK_ACCESSOR.md
    throw TypeError(
      'Unexpected Error own stack accessor functions (SES_UNEXPECTED_ERROR_OWN_STACK_ACCESSOR)');

   }
 }

/**
 * If on a v8 with the problematic error own stack accessor behavior,
 * `FERAL_STACK_GETTER` will be the shared getter of all those accessors
 * and `FERAL_STACK_SETTER` will be the shared setter. On any platform
 * without this problem, `FERAL_STACK_GETTER` and `FERAL_STACK_SETTER` are
 * both `undefined`.
 *
 * @type {(() => any) | undefined}
 */
const        FERAL_STACK_GETTER=  feralStackGetter;

/**
 * If on a v8 with the problematic error own stack accessor behavior,
 * `FERAL_STACK_GETTER` will be the shared getter of all those accessors
 * and `FERAL_STACK_SETTER` will be the shared setter. On any platform
 * without this problem, `FERAL_STACK_GETTER` and `FERAL_STACK_SETTER` are
 * both `undefined`.
 *
 * @type {((newValue: any) => void) | undefined}
 */$h‍_once.FERAL_STACK_GETTER(FERAL_STACK_GETTER);
const        FERAL_STACK_SETTER=  feralStackSetter;$h‍_once.FERAL_STACK_SETTER(FERAL_STACK_SETTER);
})()
,
// === functors[1] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let TypeError;$h‍_imports([["./commons.js", [["TypeError", [$h‍_a => (TypeError = $h‍_a)]]]]]);   

/** getThis returns globalThis in sloppy mode or undefined in strict mode. */
function getThis() {
  return this;
 }

if( getThis()) {
  // See https://github.com/endojs/endo/blob/master/packages/ses/error-codes/SES_NO_SLOPPY.md
  throw TypeError( `SES failed to initialize, sloppy mode (SES_NO_SLOPPY)`);
 }
})()
,
// === functors[2] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   $h‍_imports([]);   /* global globalThis */
// @ts-check

// `@endo/env-options` needs to be imported quite early, and so should
// avoid importing from ses or anything that depends on ses.

// /////////////////////////////////////////////////////////////////////////////
// Prelude of cheap good - enough imitations of things we'd use or
// do differently if we could depend on ses

const { freeze}=   Object;
const { apply}=   Reflect;

// Should be equivalent to the one in ses' commons.js even though it
// uses the other technique.
const uncurryThis=
  (fn)=>
  (receiver, ...args)=>
    apply(fn, receiver, args);
const arrayPush=  uncurryThis(Array.prototype.push);
const arrayIncludes=  uncurryThis(Array.prototype.includes);
const stringSplit=  uncurryThis(String.prototype.split);

const q=  JSON.stringify;

const Fail=  (literals, ...args)=>  {
  let msg=  literals[0];
  for( let i=  0; i<  args.length; i+=  1) {
    msg=   `${msg}${args[i]}${literals[i+ 1] }`;
   }
  throw Error(msg);
 };

// end prelude
// /////////////////////////////////////////////////////////////////////////////

/**
 * `makeEnvironmentCaptor` provides a mechanism for getting environment
 * variables, if they are needed, and a way to catalog the names of all
 * the environment variables that were captured.
 *
 * @param {object} aGlobal
 * @param {boolean} [dropNames] Defaults to false. If true, don't track
 * names used.
 */
const        makeEnvironmentCaptor=  (aGlobal, dropNames=  false)=>  {
  const capturedEnvironmentOptionNames=  [];

  /**
   * Gets an environment option by name and returns the option value or the
   * given default.
   *
   * @param {string} optionName
   * @param {string} defaultSetting
   * @param {string[]} [optOtherValues]
   * If provided, the option value must be included or match `defaultSetting`.
   * @returns {string}
   */
  const getEnvironmentOption=  (
    optionName,
    defaultSetting,
    optOtherValues=  undefined)=>
       {
    typeof optionName===  'string'||
      Fail `Environment option name ${q(optionName)} must be a string.`;
    typeof defaultSetting===  'string'||
      Fail `Environment option default setting ${q(
        defaultSetting)
        } must be a string.`;

    /** @type {string} */
    let setting=  defaultSetting;
    const globalProcess=  aGlobal.process||  undefined;
    const globalEnv=
       typeof globalProcess===  'object'&&  globalProcess.env||   undefined;
    if( typeof globalEnv===  'object') {
      if( optionName in globalEnv) {
        if( !dropNames) {
          arrayPush(capturedEnvironmentOptionNames, optionName);
         }
        const optionValue=  globalEnv[optionName];
        // eslint-disable-next-line @endo/no-polymorphic-call
        typeof optionValue===  'string'||
          Fail `Environment option named ${q(
            optionName)
            }, if present, must have a corresponding string value, got ${q(
            optionValue)
            }`;
        setting=  optionValue;
       }
     }
    optOtherValues===  undefined||
      setting===  defaultSetting||
      arrayIncludes(optOtherValues, setting)||
      Fail `Unrecognized ${q(optionName)} value ${q(
        setting)
        }. Expected one of ${q([defaultSetting,...optOtherValues]) }`;
    return setting;
   };
  freeze(getEnvironmentOption);

  /**
   * @param {string} optionName
   * @returns {string[]}
   */
  const getEnvironmentOptionsList=  (optionName)=>{
    const option=  getEnvironmentOption(optionName, '');
    return freeze(option===  ''?  []:  stringSplit(option, ','));
   };
  freeze(getEnvironmentOptionsList);

  const environmentOptionsListHas=  (optionName, element)=>
    arrayIncludes(getEnvironmentOptionsList(optionName), element);

  const getCapturedEnvironmentOptionNames=  ()=>  {
    return freeze([...capturedEnvironmentOptionNames]);
   };
  freeze(getCapturedEnvironmentOptionNames);

  return freeze({
    getEnvironmentOption,
    getEnvironmentOptionsList,
    environmentOptionsListHas,
    getCapturedEnvironmentOptionNames});

 };$h‍_once.makeEnvironmentCaptor(makeEnvironmentCaptor);
freeze(makeEnvironmentCaptor);

/**
 * For the simple case, where the global in question is `globalThis` and no
 * reporting of option names is desired.
 */
const        {
  getEnvironmentOption,
  getEnvironmentOptionsList,
  environmentOptionsListHas}=
    makeEnvironmentCaptor(globalThis, true);$h‍_once.getEnvironmentOption(getEnvironmentOption);$h‍_once.getEnvironmentOptionsList(getEnvironmentOptionsList);$h‍_once.environmentOptionsListHas(environmentOptionsListHas);
})()
,
// === functors[3] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   $h‍_imports([["./src/env-options.js", []]]);   
})()
,
// === functors[4] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let Set,String,isArray,arrayJoin,arraySlice,arraySort,arrayMap,keys,fromEntries,freeze,is,isError,setAdd,setHas,stringIncludes,stringStartsWith,stringifyJson,toStringTagSymbol;$h‍_imports([["../commons.js", [["Set", [$h‍_a => (Set = $h‍_a)]],["String", [$h‍_a => (String = $h‍_a)]],["isArray", [$h‍_a => (isArray = $h‍_a)]],["arrayJoin", [$h‍_a => (arrayJoin = $h‍_a)]],["arraySlice", [$h‍_a => (arraySlice = $h‍_a)]],["arraySort", [$h‍_a => (arraySort = $h‍_a)]],["arrayMap", [$h‍_a => (arrayMap = $h‍_a)]],["keys", [$h‍_a => (keys = $h‍_a)]],["fromEntries", [$h‍_a => (fromEntries = $h‍_a)]],["freeze", [$h‍_a => (freeze = $h‍_a)]],["is", [$h‍_a => (is = $h‍_a)]],["isError", [$h‍_a => (isError = $h‍_a)]],["setAdd", [$h‍_a => (setAdd = $h‍_a)]],["setHas", [$h‍_a => (setHas = $h‍_a)]],["stringIncludes", [$h‍_a => (stringIncludes = $h‍_a)]],["stringStartsWith", [$h‍_a => (stringStartsWith = $h‍_a)]],["stringifyJson", [$h‍_a => (stringifyJson = $h‍_a)]],["toStringTagSymbol", [$h‍_a => (toStringTagSymbol = $h‍_a)]]]]]);   






















/** @import {StringablePayload} from '../../types.js' */

/**
 * Joins English terms with commas and an optional conjunction.
 *
 * @param {(string | StringablePayload)[]} terms
 * @param {"and" | "or"} conjunction
 */
const        enJoin=  (terms, conjunction)=>  {
  if( terms.length===  0) {
    return '(none)';
   }else if( terms.length===  1) {
    return terms[0];
   }else if( terms.length===  2) {
    const [first, second]=  terms;
    return  `${first} ${conjunction} ${second}`;
   }else {
    return  `${arrayJoin(arraySlice(terms,0, -1), ', ') }, ${conjunction} ${
      terms[terms.length-  1]
     }`;
   }
 };

/**
 * Prepend the correct indefinite article onto a noun, typically a typeof
 * result, e.g., "an object" vs. "a number"
 *
 * @param {string} str The noun to prepend
 * @returns {string} The noun prepended with a/an
 */$h‍_once.enJoin(enJoin);
const an=  (str)=>{
  str=   `${str}`;
  if( str.length>=  1&&  stringIncludes('aeiouAEIOU', str[0])) {
    return  `an ${str}`;
   }
  return  `a ${str}`;
 };$h‍_once.an(an);
freeze(an);


/**
 * Like `JSON.stringify` but does not blow up if given a cycle or a bigint.
 * This is not
 * intended to be a serialization to support any useful unserialization,
 * or any programmatic use of the resulting string. The string is intended
 * *only* for showing a human under benign conditions, in order to be
 * informative enough for some
 * logging purposes. As such, this `bestEffortStringify` has an
 * imprecise specification and may change over time.
 *
 * The current `bestEffortStringify` possibly emits too many "seen"
 * markings: Not only for cycles, but also for repeated subtrees by
 * object identity.
 *
 * As a best effort only for diagnostic interpretation by humans,
 * `bestEffortStringify` also turns various cases that normal
 * `JSON.stringify` skips or errors on, like `undefined` or bigints,
 * into strings that convey their meaning. To distinguish this from
 * strings in the input, these synthesized strings always begin and
 * end with square brackets. To distinguish those strings from an
 * input string with square brackets, and input string that starts
 * with an open square bracket `[` is itself placed in square brackets.
 *
 * @param {any} payload
 * @param {(string|number)=} spaces
 * @returns {string}
 */
const bestEffortStringify=  (payload, spaces=  undefined)=>  {
  const seenSet=  new Set();
  const replacer=  (_, val)=>  {
    switch( typeof val){
      case 'object': {
        if( val===  null) {
          return null;
         }
        if( setHas(seenSet, val)) {
          return '[Seen]';
         }
        setAdd(seenSet, val);
        if( isError(val)) {
          return  `[${val.name}: ${val.message}]`;
         }
        if( toStringTagSymbol in val) {
          // For the built-ins that have or inherit a `Symbol.toStringTag`-named
          // property, most of them inherit the default `toString` method,
          // which will print in a similar manner: `"[object Foo]"` vs
          // `"[Foo]"`. The exceptions are
          //    * `Symbol.prototype`, `BigInt.prototype`, `String.prototype`
          //      which don't matter to us since we handle primitives
          //      separately and we don't care about primitive wrapper objects.
          //    * TODO
          //      `Date.prototype`, `TypedArray.prototype`.
          //      Hmmm, we probably should make special cases for these. We're
          //      not using these yet, so it's not urgent. But others will run
          //      into these.
          //
          // Once #2018 is closed, the only objects in our code that have or
          // inherit a `Symbol.toStringTag`-named property are remotables
          // or their remote presences.
          // This printing will do a good job for these without
          // violating abstraction layering. This behavior makes sense
          // purely in terms of JavaScript concepts. That's some of the
          // motivation for choosing that representation of remotables
          // and their remote presences in the first place.
          return  `[${val[toStringTagSymbol]}]`;
         }
        if( isArray(val)) {
          return val;
         }
        const names=  keys(val);
        if( names.length<  2) {
          return val;
         }
        let sorted=  true;
        for( let i=  1; i<  names.length; i+=  1) {
          if( names[i-  1]>=  names[i]) {
            sorted=  false;
            break;
           }
         }
        if( sorted) {
          return val;
         }
        arraySort(names);
        const entries=  arrayMap(names, (name)=>[name, val[name]]);
        return fromEntries(entries);
       }
      case 'function': {
        return  `[Function ${val.name|| '<anon>' }]`;
       }
      case 'string': {
        if( stringStartsWith(val, '[')) {
          return  `[${val}]`;
         }
        return val;
       }
      case 'undefined':
      case 'symbol': {
        return  `[${String(val)}]`;
       }
      case 'bigint': {
        return  `[${val}n]`;
       }
      case 'number': {
        if( is(val, NaN)) {
          return '[NaN]';
         }else if( val===  Infinity) {
          return '[Infinity]';
         }else if( val===  -Infinity) {
          return '[-Infinity]';
         }
        return val;
       }
      default: {
        return val;
       }}

   };
  try {
    return stringifyJson(payload, replacer, spaces);
   }catch( _err) {
    // Don't do anything more fancy here if there is any
    // chance that might throw, unless you surround that
    // with another try-catch-recovery. For example,
    // the caught thing might be a proxy or other exotic
    // object rather than an error. The proxy might throw
    // whenever it is possible for it to.
    return '[Something that failed to stringify]';
   }
 };$h‍_once.bestEffortStringify(bestEffortStringify);
freeze(bestEffortStringify);
})()
,
// === functors[5] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   $h‍_imports([]);   // @ts-check

/** @import {GenericErrorConstructor, AssertMakeErrorOptions, DetailsToken, StringablePayload} from '../../types.js' */

/**
 * @typedef {object} VirtualConsole
 * @property {Console['debug']} debug
 * @property {Console['log']} log
 * @property {Console['info']} info
 * @property {Console['warn']} warn
 * @property {Console['error']} error
 *
 * @property {Console['trace']} trace
 * @property {Console['dirxml']} dirxml
 * @property {Console['group']} group
 * @property {Console['groupCollapsed']} groupCollapsed
 *
 * @property {Console['assert']} assert
 * @property {Console['timeLog']} timeLog
 *
 * @property {Console['clear']} clear
 * @property {Console['count']} count
 * @property {Console['countReset']} countReset
 * @property {Console['dir']} dir
 * @property {Console['groupEnd']} groupEnd
 *
 * @property {Console['table']} table
 * @property {Console['time']} time
 * @property {Console['timeEnd']} timeEnd
 * @property {Console['timeStamp']} timeStamp
 */

/* This is deliberately *not* JSDoc, it is a regular comment.
 *
 * TODO: We'd like to add the following properties to the above
 * VirtualConsole, but they currently cause conflicts where
 * some Typescript implementations don't have these properties
 * on the Console type.
 *
 * @property {Console['profile']} profile
 * @property {Console['profileEnd']} profileEnd
 */

/**
 * @typedef {'debug' | 'log' | 'info' | 'warn' | 'error'} LogSeverity
 */

/**
 * @typedef ConsoleFilter
 * @property {(severity: LogSeverity) => boolean} canLog
 */

/**
 * @callback FilterConsole
 * @param {VirtualConsole} baseConsole
 * @param {ConsoleFilter} filter
 * @param {string} [topic]
 * @returns {VirtualConsole}
 */
})()
,
// === functors[6] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   $h‍_imports([]);   // @ts-check

/**
 * @typedef {readonly any[]} LogArgs
 *
 * This is an array suitable to be used as arguments of a console
 * level message *after* the format string argument. It is the result of
 * a `details` template string and consists of alternating literal strings
 * and substitution values, starting with a literal string. At least that
 * first literal string is always present.
 */

/**
 * @callback NoteCallback
 *
 * @param {Error} error
 * @param {LogArgs} noteLogArgs
 * @returns {void}
 */

/**
 * @callback GetStackString
 * @param {Error} error
 * @returns {string=}
 */

/**
 * @typedef {object} LoggedErrorHandler
 *
 * Used to parameterize `makeCausalConsole` to give it access to potentially
 * hidden information to augment the logging of errors.
 *
 * @property {GetStackString} getStackString
 * @property {(error: Error) => string} tagError
 * @property {() => void} resetErrorTagNum for debugging purposes only
 * @property {(error: Error) => (LogArgs | undefined)} getMessageLogArgs
 * @property {(error: Error) => (LogArgs | undefined)} takeMessageLogArgs
 * @property {(error: Error, callback?: NoteCallback) => LogArgs[] } takeNoteLogArgsArray
 */

// /////////////////////////////////////////////////////////////////////////////

/**
 * @typedef {readonly [string, ...any[]]} LogRecord
 */

/**
 * @typedef {object} LoggingConsoleKit
 * @property {VirtualConsole} loggingConsole
 * @property {() => readonly LogRecord[]} takeLog
 */

/**
 * @typedef {object} MakeLoggingConsoleKitOptions
 * @property {boolean=} shouldResetForDebugging
 */

/**
 * @callback MakeLoggingConsoleKit
 *
 * A logging console just accumulates the contents of all whitelisted calls,
 * making them available to callers of `takeLog()`. Calling `takeLog()`
 * consumes these, so later calls to `takeLog()` will only provide a log of
 * calls that have happened since then.
 *
 * @param {LoggedErrorHandler} loggedErrorHandler
 * @param {MakeLoggingConsoleKitOptions=} options
 * @returns {LoggingConsoleKit}
 */

/**
 * @typedef {{
 *   NOTE: 'ERROR_NOTE:',
 *   MESSAGE: 'ERROR_MESSAGE:',
 *   CAUSE: 'cause:',
 *   ERRORS: 'errors:',
 * }} ErrorInfo
 */

/**
 * @typedef {ErrorInfo[keyof ErrorInfo]} ErrorInfoKind
 */

/**
 * @callback MakeCausalConsole
 *
 * Makes a causal console wrapper of a `baseConsole`, where the causal console
 * calls methods of the `loggedErrorHandler` to customize how it handles logged
 * errors.
 *
 * @param {VirtualConsole | undefined} baseConsole
 * @param {LoggedErrorHandler} loggedErrorHandler
 * @returns {VirtualConsole | undefined}
 */
})()
,
// === functors[7] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   $h‍_imports([]);   // @ts-check
/* eslint-disable @endo/no-polymorphic-call */

// eslint-disable-next-line no-restricted-globals
const { isSafeInteger}=   Number;
// eslint-disable-next-line no-restricted-globals
const { freeze}=   Object;
// eslint-disable-next-line no-restricted-globals
const { toStringTag: toStringTagSymbol}=   Symbol;

/**
 * @template Data
 * @typedef {object} DoublyLinkedCell
 * A cell of a doubly-linked ring, i.e., a doubly-linked circular list.
 * DoublyLinkedCells are not frozen, and so should be closely encapsulated by
 * any abstraction that uses them.
 * @property {DoublyLinkedCell<Data>} next
 * @property {DoublyLinkedCell<Data>} prev
 * @property {Data} data
 */

/**
 * Makes a new self-linked cell. There are two reasons to do so:
 *    * To make the head sigil of a new initially-empty doubly-linked ring.
 *    * To make a non-sigil cell to be `spliceAfter`ed.
 *
 * @template Data
 * @param {Data} data
 * @returns {DoublyLinkedCell<Data>}
 */
const makeSelfCell=  (data)=>{
  /** @type {Partial<DoublyLinkedCell<Data>>} */
  const incompleteCell=  {
    next: undefined,
    prev: undefined,
    data};

  const selfCell=  /** @type {DoublyLinkedCell<Data>} */  incompleteCell;
  selfCell.next=  selfCell;
  selfCell.prev=  selfCell;
  // Not frozen!
  return selfCell;
 };

/**
 * Splices a self-linked non-sigil cell into a ring after `prev`.
 * `prev` could be the head sigil, or it could be some other non-sigil
 * cell within a ring.
 *
 * @template Data
 * @param {DoublyLinkedCell<Data>} prev
 * @param {DoublyLinkedCell<Data>} selfCell
 */
const spliceAfter=  (prev, selfCell)=>  {
  if( prev===  selfCell) {
    // eslint-disable-next-line no-restricted-globals
    throw TypeError('Cannot splice a cell into itself');
   }
  if( selfCell.next!==  selfCell||  selfCell.prev!==  selfCell) {
    // eslint-disable-next-line no-restricted-globals
    throw TypeError('Expected self-linked cell');
   }
  const cell=  selfCell;
  // rename variable cause it isn't self-linked after this point.

  const next=  prev.next;
  cell.prev=  prev;
  cell.next=  next;
  prev.next=  cell;
  next.prev=  cell;
  // Not frozen!
  return cell;
 };

/**
 * @template Data
 * @param {DoublyLinkedCell<Data>} cell
 * No-op if the cell is self-linked.
 */
const spliceOut=  (cell)=>{
  const { prev, next}=   cell;
  prev.next=  next;
  next.prev=  prev;
  cell.prev=  cell;
  cell.next=  cell;
 };

/**
 * The LRUCacheMap is used within the implementation of `assert` and so
 * at a layer below SES or harden. Thus, we give it a `WeakMap`-like interface
 * rather than a `WeakMapStore`-like interface. To work before `lockdown`,
 * the implementation must use `freeze` manually, but still exhaustively.
 *
 * It implements the WeakMap interface, and holds its keys weakly.  Cached
 * values are only held while the key is held by the user and the key/value
 * bookkeeping cell has not been pushed off the end of the cache by `budget`
 * number of more recently referenced cells.  If the key is dropped by the user,
 * the value will no longer be held by the cache, but the bookkeeping cell
 * itself will stay in memory.
 *
 * @template {{}} K
 * @template {unknown} V
 * @param {number} keysBudget
 * @returns {WeakMap<K,V>}
 */
const        makeLRUCacheMap=  (keysBudget)=>{
  if( !isSafeInteger(keysBudget)||  keysBudget<  0) {
    // eslint-disable-next-line no-restricted-globals
    throw TypeError('keysBudget must be a safe non-negative integer number');
   }
  /** @typedef {DoublyLinkedCell<WeakMap<K, V> | undefined>} LRUCacheCell */
  /** @type {WeakMap<K, LRUCacheCell>} */
  // eslint-disable-next-line no-restricted-globals
  const keyToCell=  new WeakMap();
  let size=  0; // `size` must remain <= `keysBudget`
  // As a sigil, `head` uniquely is not in the `keyToCell` map.
  /** @type {LRUCacheCell} */
  const head=  makeSelfCell(undefined);

  const touchCell=  (key)=>{
    const cell=  keyToCell.get(key);
    if( cell===  undefined||  cell.data===  undefined) {
      // Either the key was GCed, or the cell was condemned.
      return undefined;
     }
    // Becomes most recently used
    spliceOut(cell);
    spliceAfter(head, cell);
    return cell;
   };

  /**
   * @param {K} key
   */
  const has=  (key)=>touchCell(key)!==  undefined;
  freeze(has);

  /**
   * @param {K} key
   */
  // UNTIL https://github.com/endojs/endo/issues/1514
  // Prefer: const get = key => touchCell(key)?.data?.get(key);
  const get=  (key)=>{
    const cell=  touchCell(key);
    return cell&&  cell.data&&  cell.data.get(key);
   };
  freeze(get);

  /**
   * @param {K} key
   * @param {V} value
   */
  const set=  (key, value)=>  {
    if( keysBudget<  1) {
      // eslint-disable-next-line no-use-before-define
      return lruCacheMap; // Implements WeakMap.set
     }

    let cell=  touchCell(key);
    if( cell===  undefined) {
      cell=  makeSelfCell(undefined);
      spliceAfter(head, cell); // start most recently used
     }
    if( !cell.data) {
      // Either a fresh cell or a reused condemned cell.
      size+=  1;
      // Add its data.
      // eslint-disable-next-line no-restricted-globals
      cell.data=  new WeakMap();
      // Advertise the cell for this key.
      keyToCell.set(key, cell);
      while( size>  keysBudget) {
        const condemned=  head.prev;
        spliceOut(condemned); // Drop least recently used
        condemned.data=  undefined;
        size-=  1;
       }
     }

    // Update the data.
    cell.data.set(key, value);

    // eslint-disable-next-line no-use-before-define
    return lruCacheMap; // Implements WeakMap.set
   };
  freeze(set);

  // "delete" is a keyword.
  /**
   * @param {K} key
   */
  const deleteIt=  (key)=>{
    const cell=  keyToCell.get(key);
    if( cell===  undefined) {
      return false;
     }
    spliceOut(cell);
    keyToCell.delete(key);
    if( cell.data===  undefined) {
      // Already condemned.
      return false;
     }

    cell.data=  undefined;
    size-=  1;
    return true;
   };
  freeze(deleteIt);

  const lruCacheMap=  freeze({
    has,
    get,
    set,
    delete: deleteIt,
    // eslint-disable-next-line jsdoc/check-types
    [/** @type {typeof Symbol.toStringTag} */  toStringTagSymbol]:
      'LRUCacheMap'});

  return lruCacheMap;
 };$h‍_once.makeLRUCacheMap(makeLRUCacheMap);
freeze(makeLRUCacheMap);
})()
,
// === functors[8] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let makeLRUCacheMap;$h‍_imports([["../make-lru-cachemap.js", [["makeLRUCacheMap", [$h‍_a => (makeLRUCacheMap = $h‍_a)]]]],["./internal-types.js", []]]);   






const { freeze}=   Object;
const { isSafeInteger}=   Number;

const defaultLoggedErrorsBudget=  1000;
const defaultArgsPerErrorBudget=  100;

/**
 * @param {number} [errorsBudget]
 * @param {number} [argsPerErrorBudget]
 */
const        makeNoteLogArgsArrayKit=  (
  errorsBudget=  defaultLoggedErrorsBudget,
  argsPerErrorBudget=  defaultArgsPerErrorBudget)=>
     {
  if( !isSafeInteger(argsPerErrorBudget)||  argsPerErrorBudget<  1) {
    throw TypeError(
      'argsPerErrorBudget must be a safe positive integer number');

   }

  /**
   * @type {WeakMap<Error, LogArgs[]>}
   *
   * Maps from an error to an array of log args, where each log args is
   * remembered as an annotation on that error. This can be used, for example,
   * to keep track of additional causes of the error. The elements of any
   * log args may include errors which are associated with further annotations.
   * An augmented console, like the causal console of `console.js`, could
   * then retrieve the graph of such annotations.
   */
  const noteLogArgsArrayMap=  makeLRUCacheMap(errorsBudget);

  /**
   * @param {Error} error
   * @param {LogArgs} logArgs
   */
  const addLogArgs=  (error, logArgs)=>  {
    const logArgsArray=  noteLogArgsArrayMap.get(error);
    if( logArgsArray!==  undefined) {
      if( logArgsArray.length>=  argsPerErrorBudget) {
        logArgsArray.shift();
       }
      logArgsArray.push(logArgs);
     }else {
      noteLogArgsArrayMap.set(error, [logArgs]);
     }
   };
  freeze(addLogArgs);

  /**
   * @param {Error} error
   * @returns {LogArgs[] | undefined}
   */
  const takeLogArgsArray=  (error)=>{
    const result=  noteLogArgsArrayMap.get(error);
    noteLogArgsArrayMap.delete(error);
    return result;
   };
  freeze(takeLogArgsArray);

  return freeze({
    addLogArgs,
    takeLogArgsArray});

 };$h‍_once.makeNoteLogArgsArrayKit(makeNoteLogArgsArrayKit);
freeze(makeNoteLogArgsArrayKit);
})()
,
// === functors[9] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let RangeError,TypeError,WeakMap,arrayJoin,arrayMap,arrayPop,arrayPush,assign,freeze,defineProperty,globalThis,is,isError,regexpTest,stringIndexOf,stringReplace,stringSlice,stringStartsWith,weakmapDelete,weakmapGet,weakmapHas,weakmapSet,AggregateError,getOwnPropertyDescriptors,ownKeys,create,objectPrototype,objectHasOwnProperty,an,bestEffortStringify,makeNoteLogArgsArrayKit;$h‍_imports([["../commons.js", [["RangeError", [$h‍_a => (RangeError = $h‍_a)]],["TypeError", [$h‍_a => (TypeError = $h‍_a)]],["WeakMap", [$h‍_a => (WeakMap = $h‍_a)]],["arrayJoin", [$h‍_a => (arrayJoin = $h‍_a)]],["arrayMap", [$h‍_a => (arrayMap = $h‍_a)]],["arrayPop", [$h‍_a => (arrayPop = $h‍_a)]],["arrayPush", [$h‍_a => (arrayPush = $h‍_a)]],["assign", [$h‍_a => (assign = $h‍_a)]],["freeze", [$h‍_a => (freeze = $h‍_a)]],["defineProperty", [$h‍_a => (defineProperty = $h‍_a)]],["globalThis", [$h‍_a => (globalThis = $h‍_a)]],["is", [$h‍_a => (is = $h‍_a)]],["isError", [$h‍_a => (isError = $h‍_a)]],["regexpTest", [$h‍_a => (regexpTest = $h‍_a)]],["stringIndexOf", [$h‍_a => (stringIndexOf = $h‍_a)]],["stringReplace", [$h‍_a => (stringReplace = $h‍_a)]],["stringSlice", [$h‍_a => (stringSlice = $h‍_a)]],["stringStartsWith", [$h‍_a => (stringStartsWith = $h‍_a)]],["weakmapDelete", [$h‍_a => (weakmapDelete = $h‍_a)]],["weakmapGet", [$h‍_a => (weakmapGet = $h‍_a)]],["weakmapHas", [$h‍_a => (weakmapHas = $h‍_a)]],["weakmapSet", [$h‍_a => (weakmapSet = $h‍_a)]],["AggregateError", [$h‍_a => (AggregateError = $h‍_a)]],["getOwnPropertyDescriptors", [$h‍_a => (getOwnPropertyDescriptors = $h‍_a)]],["ownKeys", [$h‍_a => (ownKeys = $h‍_a)]],["create", [$h‍_a => (create = $h‍_a)]],["objectPrototype", [$h‍_a => (objectPrototype = $h‍_a)]],["objectHasOwnProperty", [$h‍_a => (objectHasOwnProperty = $h‍_a)]]]],["./stringify-utils.js", [["an", [$h‍_a => (an = $h‍_a)]],["bestEffortStringify", [$h‍_a => (bestEffortStringify = $h‍_a)]]]],["./types.js", []],["./internal-types.js", []],["./note-log-args.js", [["makeNoteLogArgsArrayKit", [$h‍_a => (makeNoteLogArgsArrayKit = $h‍_a)]]]]]);   















































/**
 * @import {BaseAssert, Assert, AssertionFunctions, AssertionUtilities, StringablePayload, DetailsToken, MakeAssert} from '../../types.js'
 */

// For our internal debugging purposes, uncomment
// const internalDebugConsole = console;

// /////////////////////////////////////////////////////////////////////////////

/** @type {WeakMap<StringablePayload, any>} */
const declassifiers=  new WeakMap();

/** @type {AssertionUtilities['quote']} */
const quote=  (payload, spaces=  undefined)=>  {
  const result=  freeze({
    toString: freeze(()=>  bestEffortStringify(payload, spaces))});

  weakmapSet(declassifiers, result, payload);
  return result;
 };
freeze(quote);

const canBeBare=  freeze(/^[\w:-]( ?[\w:-])*$/);

/**
 * @type {AssertionUtilities['bare']}
 */
const bare=  (payload, spaces=  undefined)=>  {
  if( typeof payload!==  'string'||  !regexpTest(canBeBare, payload)) {
    return quote(payload, spaces);
   }
  const result=  freeze({
    toString: freeze(()=>  payload)});

  weakmapSet(declassifiers, result, payload);
  return result;
 };
freeze(bare);

// /////////////////////////////////////////////////////////////////////////////

/**
 * @typedef {object} HiddenDetails
 *
 * Captures the arguments passed to the `details` template string tag.
 *
 * @property {TemplateStringsArray | string[]} template
 * @property {any[]} args
 */

/**
 * @type {WeakMap<DetailsToken, HiddenDetails>}
 *
 * Maps from a details token which a `details` template literal returned
 * to a record of the contents of that template literal expression.
 */
const hiddenDetailsMap=  new WeakMap();

/**
 * @param {HiddenDetails} hiddenDetails
 * @returns {string}
 */
const getMessageString=  ({ template, args})=>   {
  const parts=  [template[0]];
  for( let i=  0; i<  args.length; i+=  1) {
    const arg=  args[i];
    let argStr;
    if( weakmapHas(declassifiers, arg)) {
      argStr=   `${arg}`;
     }else if( isError(arg)) {
      argStr=   `(${an(arg.name)})`;
     }else {
      argStr=   `(${an(typeof arg)})`;
     }
    arrayPush(parts, argStr, template[i+  1]);
   }
  return arrayJoin(parts, '');
 };

/**
 * Give detailsTokens a toString behavior. To minimize the overhead of
 * creating new detailsTokens, we do this with an
 * inherited `this` sensitive `toString` method, even though we normally
 * avoid `this` sensitivity. To protect the method from inappropriate
 * `this` application, it does something interesting only for objects
 * registered in `redactedDetails`, which should be exactly the detailsTokens.
 *
 * The printing behavior must not reveal anything redacted, so we just use
 * the same `getMessageString` we use to construct the redacted message
 * string for a thrown assertion error.
 */
const DetailsTokenProto=  freeze({
  toString() {
    const hiddenDetails=  weakmapGet(hiddenDetailsMap, this);
    if( hiddenDetails===  undefined) {
      return '[Not a DetailsToken]';
     }
    return getMessageString(hiddenDetails);
   }});

freeze(DetailsTokenProto.toString);

/**
 * Normally this is the function exported as `assert.details` and often
 * spelled `d`. However, if the `{errorTaming: 'unsafe'}` option is given to
 * `lockdown`, then `unredactedDetails` is used instead.
 *
 * There are some unconditional uses of `redactedDetails` in this module. All
 * of them should be uses where the template literal has no redacted
 * substitution values. In those cases, the two are equivalent.
 *
 * @type {AssertionUtilities['details']}
 */
const redactedDetails=  (template, ...args)=>  {
  // Keep in mind that the vast majority of calls to `details` creates
  // a details token that is never used, so this path must remain as fast as
  // possible. Hence we store what we've got with little processing, postponing
  // all the work to happen only if needed, for example, if an assertion fails.
  const detailsToken=  freeze({ __proto__: DetailsTokenProto});
  weakmapSet(hiddenDetailsMap, detailsToken, { template, args});
  return (/** @type {DetailsToken} */ /** @type {unknown} */  detailsToken);
 };
freeze(redactedDetails);

/**
 * `unredactedDetails` is like `details` except that it does not redact
 * anything. It acts like `details` would act if all substitution values
 * were wrapped with the `quote` function above (the function normally
 * spelled `q`). If the `{errorTaming: 'unsafe'}` option is given to
 * `lockdown`, then the lockdown-shim arranges for the global `assert` to be
 * one whose `details` property is `unredactedDetails`.
 * This setting optimizes the debugging and testing experience at the price
 * of safety. `unredactedDetails` also sacrifices the speed of `details`,
 * which is usually fine in debugging and testing.
 *
 * @type {AssertionUtilities['details']}
 */
const unredactedDetails=  (template, ...args)=>  {
  args=  arrayMap(args, (arg)=>
    weakmapHas(declassifiers, arg)?  arg:  quote(arg));

  return redactedDetails(template, ...args);
 };$h‍_once.unredactedDetails(unredactedDetails);
freeze(unredactedDetails);


/**
 * @param {HiddenDetails} hiddenDetails
 * @returns {LogArgs}
 */
const getLogArgs=  ({ template, args})=>   {
  const logArgs=  [template[0]];
  for( let i=  0; i<  args.length; i+=  1) {
    let arg=  args[i];
    if( weakmapHas(declassifiers, arg)) {
      arg=  weakmapGet(declassifiers, arg);
     }
    // Remove the extra spaces (since console.error puts them
    // between each cause).
    const priorWithoutSpace=  stringReplace(arrayPop(logArgs)||  '', / $/, '');
    if( priorWithoutSpace!==  '') {
      arrayPush(logArgs, priorWithoutSpace);
     }
    const nextWithoutSpace=  stringReplace(template[i+  1], /^ /, '');
    arrayPush(logArgs, arg, nextWithoutSpace);
   }
  if( logArgs[logArgs.length-  1]===  '') {
    arrayPop(logArgs);
   }
  return logArgs;
 };

/**
 * @type {WeakMap<Error, LogArgs>}
 *
 * Maps from an error object to the log args that are a more informative
 * alternative message for that error. When logging the error, these
 * log args should be preferred to `error.message`.
 */
const hiddenMessageLogArgs=  new WeakMap();

// So each error tag will be unique.
let errorTagNum=  0;

/**
 * @type {WeakMap<Error, string>}
 */
const errorTags=  new WeakMap();

/**
 * @param {Error} err
 * @param {string=} optErrorName
 * @returns {string}
 */
const tagError=  (err, optErrorName=  err.name)=>  {
  let errorTag=  weakmapGet(errorTags, err);
  if( errorTag!==  undefined) {
    return errorTag;
   }
  errorTagNum+=  1;
  errorTag=   `${optErrorName}#${errorTagNum}`;
  weakmapSet(errorTags, err, errorTag);
  return errorTag;
 };

/**
 * Make reasonable best efforts to make a `Passable` error.
 *   - `sanitizeError` will remove any "extraneous" own properties already added
 *     by the host,
 *     such as `fileName`,`lineNumber` on FireFox or `line` on Safari.
 *   - If any such "extraneous" properties were removed, `sanitizeError` will
 *     annotate
 *     the error with them, so they still appear on the causal console
 *     log output for diagnostic purposes, but not be otherwise visible.
 *   - `sanitizeError` will ensure that any expected properties already
 *     added by the host are data
 *     properties, converting accessor properties to data properties as needed,
 *     such as `stack` on v8 (Chrome, Brave, Edge?)
 *   - `sanitizeError` will freeze the error, preventing any correct engine from
 *     adding or
 *     altering any of the error's own properties `sanitizeError` is done.
 *
 * However, `sanitizeError` will not, for example, `harden`
 * (i.e., deeply freeze)
 * or ensure that the `cause` or `errors` property satisfy the `Passable`
 * constraints. The purpose of `sanitizeError` is only to protect against
 * mischief the host may have already added to the error as created,
 * not to ensure that the error is actually Passable. For that,
 * see `toPassableError` in `@endo/pass-style`.
 *
 * @param {Error} error
 */
const        sanitizeError=  (error)=>{
  const descs=  getOwnPropertyDescriptors(error);
  const {
    name: _nameDesc,
    message: _messageDesc,
    errors: _errorsDesc=  undefined,
    cause: _causeDesc=  undefined,
    stack: _stackDesc=  undefined,
    ...restDescs}=
      descs;

  const restNames=  ownKeys(restDescs);
  if( restNames.length>=  1) {
    for( const name of restNames) {
      delete error[name];
     }
    const droppedNote=  create(objectPrototype, restDescs);
    // eslint-disable-next-line no-use-before-define
    note(
      error,
      redactedDetails `originally with properties ${quote(droppedNote)}`);

   }
  for( const name of ownKeys(error)) {
    // @ts-expect-error TS still confused by symbols as property names
    const desc=  descs[name];
    if( desc&&  objectHasOwnProperty(desc, 'get')) {
      defineProperty(error, name, {
        value: error[name]  // invoke the getter to convert to data property
});
     }
   }
  freeze(error);
 };

/**
 * @type {AssertionUtilities['error']}
 */$h‍_once.sanitizeError(sanitizeError);
const makeError=  (
  optDetails=  redactedDetails `Assert failed`,
  errConstructor=  globalThis.Error,
  {
    errorName=  undefined,
    cause=  undefined,
    errors=  undefined,
    sanitize=  true}=
      {})=>
     {
  if( typeof optDetails===  'string') {
    // If it is a string, use it as the literal part of the template so
    // it doesn't get quoted.
    optDetails=  redactedDetails([optDetails]);
   }
  const hiddenDetails=  weakmapGet(hiddenDetailsMap, optDetails);
  if( hiddenDetails===  undefined) {
    throw TypeError( `unrecognized details ${quote(optDetails)}`);
   }
  const messageString=  getMessageString(hiddenDetails);
  const opts=  cause&&  { cause};
  let error;
  if(
    typeof AggregateError!==  'undefined'&&
    errConstructor===  AggregateError)
    {
    error=  AggregateError(errors||  [], messageString, opts);
   }else {
    error=  /** @type {ErrorConstructor} */  errConstructor(
      messageString,
      opts);

    if( errors!==  undefined) {
      // Since we need to tolerate `errors` on an AggregateError, may as
      // well tolerate it on all errors.
      defineProperty(error, 'errors', {
        value: errors,
        writable: true,
        enumerable: false,
        configurable: true});

     }
   }
  weakmapSet(hiddenMessageLogArgs, error, getLogArgs(hiddenDetails));
  if( errorName!==  undefined) {
    tagError(error, errorName);
   }
  if( sanitize) {
    sanitizeError(error);
   }
  // The next line is a particularly fruitful place to put a breakpoint.
  return error;
 };
freeze(makeError);

// /////////////////////////////////////////////////////////////////////////////

const { addLogArgs, takeLogArgsArray}=   makeNoteLogArgsArrayKit();

/**
 * @type {WeakMap<Error, NoteCallback[]>}
 *
 * An augmented console will normally only take the hidden noteArgs array once,
 * when it logs the error being annotated. Once that happens, further
 * annotations of that error should go to the console immediately. We arrange
 * that by accepting a note-callback function from the console as an optional
 * part of that taking operation. Normally there will only be at most one
 * callback per error, but that depends on console behavior which we should not
 * assume. We make this an array of callbacks so multiple registrations
 * are independent.
 */
const hiddenNoteCallbackArrays=  new WeakMap();

/** @type {AssertionUtilities['note']} */
const note=  (error, detailsNote)=>  {
  if( typeof detailsNote===  'string') {
    // If it is a string, use it as the literal part of the template so
    // it doesn't get quoted.
    detailsNote=  redactedDetails([detailsNote]);
   }
  const hiddenDetails=  weakmapGet(hiddenDetailsMap, detailsNote);
  if( hiddenDetails===  undefined) {
    throw TypeError( `unrecognized details ${quote(detailsNote)}`);
   }
  const logArgs=  getLogArgs(hiddenDetails);
  const callbacks=  weakmapGet(hiddenNoteCallbackArrays, error);
  if( callbacks!==  undefined) {
    for( const callback of callbacks) {
      callback(error, logArgs);
     }
   }else {
    addLogArgs(error, logArgs);
   }
 };
freeze(note);

/**
 * The unprivileged form that just uses the de facto `error.stack` property.
 * The start compartment normally has a privileged `globalThis.getStackString`
 * which should be preferred if present.
 *
 * @param {Error} error
 * @returns {string}
 */
const defaultGetStackString=  (error)=>{
  if( !('stack'in  error)) {
    return '';
   }
  const stackString=   `${error.stack}`;
  const pos=  stringIndexOf(stackString, '\n');
  if( stringStartsWith(stackString, ' ')||  pos===  -1) {
    return stackString;
   }
  return stringSlice(stackString, pos+  1); // exclude the initial newline
 };

/** @type {LoggedErrorHandler} */
const loggedErrorHandler=  {
  getStackString: globalThis.getStackString||  defaultGetStackString,
  tagError: (error)=>tagError(error),
  resetErrorTagNum: ()=>  {
    errorTagNum=  0;
   },
  getMessageLogArgs: (error)=>weakmapGet(hiddenMessageLogArgs, error),
  takeMessageLogArgs: (error)=>{
    const result=  weakmapGet(hiddenMessageLogArgs, error);
    weakmapDelete(hiddenMessageLogArgs, error);
    return result;
   },
  takeNoteLogArgsArray: (error, callback)=>  {
    const result=  takeLogArgsArray(error);
    if( callback!==  undefined) {
      const callbacks=  weakmapGet(hiddenNoteCallbackArrays, error);
      if( callbacks) {
        arrayPush(callbacks, callback);
       }else {
        weakmapSet(hiddenNoteCallbackArrays, error, [callback]);
       }
     }
    return result||  [];
   }};$h‍_once.loggedErrorHandler(loggedErrorHandler);

freeze(loggedErrorHandler);


// /////////////////////////////////////////////////////////////////////////////

/**
 * @type {MakeAssert}
 */
const makeAssert=  (optRaise=  undefined, unredacted=  false)=>  {
  const details=  unredacted?  unredactedDetails:  redactedDetails;
  const assertFailedDetails=  details `Check failed`;

  /** @type {AssertionFunctions['fail']} */
  const fail=  (
    optDetails=  assertFailedDetails,
    errConstructor=  undefined,
    options=  undefined)=>
       {
    const reason=  makeError(optDetails, errConstructor, options);
    if( optRaise!==  undefined) {
      // @ts-ignore returns `never` doesn't mean it isn't callable
      optRaise(reason);
     }
    throw reason;
   };
  freeze(fail);

  /** @type {AssertionUtilities['Fail']} */
  const Fail=  (template, ...args)=>  fail(details(template, ...args));

  // Don't freeze or export `baseAssert` until we add methods.
  // TODO If I change this from a `function` function to an arrow
  // function, I seem to get type errors from TypeScript. Why?
  /** @type {BaseAssert} */
  function baseAssert(
    flag,
    optDetails=  undefined,
    errConstructor=  undefined,
    options=  undefined)
    {
    flag||  fail(optDetails, errConstructor, options);
   }

  /** @type {AssertionFunctions['equal']} */
  const equal=  (
    actual,
    expected,
    optDetails=  undefined,
    errConstructor=  undefined,
    options=  undefined)=>
       {
    is(actual, expected)||
      fail(
        optDetails||  details `Expected ${actual} is same as ${expected}`,
        errConstructor||  RangeError,
        options);

   };
  freeze(equal);

  /** @type {AssertionFunctions['typeof']} */
  const assertTypeof=  (specimen, typename, optDetails)=>  {
    // This will safely fall through if typename is not a string,
    // which is what we want.
    // eslint-disable-next-line valid-typeof
    if( typeof specimen===  typename) {
      return;
     }
    typeof typename===  'string'||  Fail `${quote(typename)} must be a string`;

    if( optDetails===  undefined) {
      // Embed the type phrase without quotes.
      const typeWithDeterminer=  an(typename);
      optDetails=  details `${specimen} must be ${bare(typeWithDeterminer)}`;
     }
    fail(optDetails, TypeError);
   };
  freeze(assertTypeof);

  /** @type {AssertionFunctions['string']} */
  const assertString=  (specimen, optDetails=  undefined)=>
    assertTypeof(specimen, 'string', optDetails);

  // Note that "assert === baseAssert"
  /** @type {Assert} */
  const assert=  assign(baseAssert, {
    error: makeError,
    fail,
    equal,
    typeof: assertTypeof,
    string: assertString,
    note,
    details,
    Fail,
    quote,
    bare,
    makeAssert});

  return freeze(assert);
 };$h‍_once.makeAssert(makeAssert);
freeze(makeAssert);


/** @type {Assert} */
const assert=  makeAssert();$h‍_once.assert(assert);
})()
,
// === functors[10] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let Set,String,TypeError,WeakSet,globalThis,apply,arrayForEach,defineProperty,freeze,getOwnPropertyDescriptor,getOwnPropertyDescriptors,getPrototypeOf,isInteger,isObject,objectHasOwnProperty,ownKeys,preventExtensions,setAdd,setForEach,setHas,toStringTagSymbol,typedArrayPrototype,weaksetAdd,weaksetHas,FERAL_STACK_GETTER,FERAL_STACK_SETTER,isError,assert;$h‍_imports([["./commons.js", [["Set", [$h‍_a => (Set = $h‍_a)]],["String", [$h‍_a => (String = $h‍_a)]],["TypeError", [$h‍_a => (TypeError = $h‍_a)]],["WeakSet", [$h‍_a => (WeakSet = $h‍_a)]],["globalThis", [$h‍_a => (globalThis = $h‍_a)]],["apply", [$h‍_a => (apply = $h‍_a)]],["arrayForEach", [$h‍_a => (arrayForEach = $h‍_a)]],["defineProperty", [$h‍_a => (defineProperty = $h‍_a)]],["freeze", [$h‍_a => (freeze = $h‍_a)]],["getOwnPropertyDescriptor", [$h‍_a => (getOwnPropertyDescriptor = $h‍_a)]],["getOwnPropertyDescriptors", [$h‍_a => (getOwnPropertyDescriptors = $h‍_a)]],["getPrototypeOf", [$h‍_a => (getPrototypeOf = $h‍_a)]],["isInteger", [$h‍_a => (isInteger = $h‍_a)]],["isObject", [$h‍_a => (isObject = $h‍_a)]],["objectHasOwnProperty", [$h‍_a => (objectHasOwnProperty = $h‍_a)]],["ownKeys", [$h‍_a => (ownKeys = $h‍_a)]],["preventExtensions", [$h‍_a => (preventExtensions = $h‍_a)]],["setAdd", [$h‍_a => (setAdd = $h‍_a)]],["setForEach", [$h‍_a => (setForEach = $h‍_a)]],["setHas", [$h‍_a => (setHas = $h‍_a)]],["toStringTagSymbol", [$h‍_a => (toStringTagSymbol = $h‍_a)]],["typedArrayPrototype", [$h‍_a => (typedArrayPrototype = $h‍_a)]],["weaksetAdd", [$h‍_a => (weaksetAdd = $h‍_a)]],["weaksetHas", [$h‍_a => (weaksetHas = $h‍_a)]],["FERAL_STACK_GETTER", [$h‍_a => (FERAL_STACK_GETTER = $h‍_a)]],["FERAL_STACK_SETTER", [$h‍_a => (FERAL_STACK_SETTER = $h‍_a)]],["isError", [$h‍_a => (isError = $h‍_a)]]]],["./error/assert.js", [["assert", [$h‍_a => (assert = $h‍_a)]]]]]);   





















































/**
 * @import {Harden} from '../types.js'
 */

// Obtain the string tag accessor of of TypedArray so we can indirectly use the
// TypedArray brand check it employs.
const typedArrayToStringTag=  getOwnPropertyDescriptor(
  typedArrayPrototype,
  toStringTagSymbol);

assert(typedArrayToStringTag);
const getTypedArrayToStringTag=  typedArrayToStringTag.get;
assert(getTypedArrayToStringTag);

// Exported for tests.
/**
 * Duplicates packages/marshal/src/helpers/passStyle-helpers.js to avoid a dependency.
 *
 * @param {unknown} object
 */
const        isTypedArray=  (object)=>{
  // The object must pass a brand check or toStringTag will return undefined.
  const tag=  apply(getTypedArrayToStringTag, object, []);
  return tag!==  undefined;
 };

/**
 * Tests if a property key is an integer-valued canonical numeric index.
 * https://tc39.es/ecma262/#sec-canonicalnumericindexstring
 *
 * @param {string | symbol} propertyKey
 */$h‍_once.isTypedArray(isTypedArray);
const isCanonicalIntegerIndexString=  (propertyKey)=>{
  const n=  +String(propertyKey);
  return isInteger(n)&&  String(n)===  propertyKey;
 };

/**
 * @template T
 * @param {ArrayLike<T>} array
 */
const freezeTypedArray=  (array)=>{
  preventExtensions(array);

  // Downgrade writable expandos to readonly, even if non-configurable.
  // We get each descriptor individually rather than using
  // getOwnPropertyDescriptors in order to fail safe when encountering
  // an obscure GraalJS issue where getOwnPropertyDescriptor returns
  // undefined for a property that does exist.
  arrayForEach(ownKeys(array), (/** @type {string | symbol} */ name)=>  {
    const desc=  getOwnPropertyDescriptor(array, name);
    assert(desc);
    // TypedArrays are integer-indexed exotic objects, which define special
    // treatment for property names in canonical numeric form:
    // integers in range are permanently writable and non-configurable.
    // https://tc39.es/ecma262/#sec-integer-indexed-exotic-objects
    //
    // This is analogous to the data of a hardened Map or Set,
    // so we carve out this exceptional behavior but make all other
    // properties non-configurable.
    if( !isCanonicalIntegerIndexString(name)) {
      defineProperty(array, name, {
        ...desc,
        writable: false,
        configurable: false});

     }
   });
 };

/**
 * Create a `harden` function.
 *
 * @returns {Harden}
 */
const        makeHardener=  ()=>  {
  // Use a native hardener if possible.
  if( typeof globalThis.harden===  'function') {
    const safeHarden=  globalThis.harden;
    return safeHarden;
   }

  const hardened=  new WeakSet();

  const { harden}=   {
    /**
     * @template T
     * @param {T} root
     * @returns {T}
     */
    harden(root) {
      const toFreeze=  new Set();

      // If val is something we should be freezing but aren't yet,
      // add it to toFreeze.
      /**
       * @param {any} val
       */
      function enqueue(val) {
        if( !isObject(val)) {
          // ignore primitives
          return;
         }
        const type=  typeof val;
        if( type!==  'object'&&  type!==  'function') {
          // future proof: break until someone figures out what it should do
          throw TypeError( `Unexpected typeof: ${type}`);
         }
        if( weaksetHas(hardened, val)||  setHas(toFreeze, val)) {
          // Ignore if this is an exit, or we've already visited it
          return;
         }
        // console.warn(`adding ${val} to toFreeze`, val);
        setAdd(toFreeze, val);
       }

      /**
       * @param {any} obj
       */
      const baseFreezeAndTraverse=  (obj)=>{
        // Now freeze the object to ensure reactive
        // objects such as proxies won't add properties
        // during traversal, before they get frozen.

        // Object are verified before being enqueued,
        // therefore this is a valid candidate.
        // Throws if this fails (strict mode).
        // Also throws if the object is an ArrayBuffer or any TypedArray.
        if( isTypedArray(obj)) {
          freezeTypedArray(obj);
         }else {
          freeze(obj);
         }

        // we rely upon certain commitments of Object.freeze and proxies here

        // get stable/immutable outbound links before a Proxy has a chance to do
        // something sneaky.
        const descs=  getOwnPropertyDescriptors(obj);
        const proto=  getPrototypeOf(obj);
        enqueue(proto);

        arrayForEach(ownKeys(descs), (/** @type {string | symbol} */ name)=>  {
          // The 'name' may be a symbol, and TypeScript doesn't like us to
          // index arbitrary symbols on objects, so we pretend they're just
          // strings.
          const desc=  descs[/** @type {string} */  name];
          // getOwnPropertyDescriptors is guaranteed to return well-formed
          // descriptors, but they still inherit from Object.prototype. If
          // someone has poisoned Object.prototype to add 'value' or 'get'
          // properties, then a simple 'if ("value" in desc)' or 'desc.value'
          // test could be confused. We use hasOwnProperty to be sure about
          // whether 'value' is present or not, which tells us for sure that
          // this is a data property.
          if( objectHasOwnProperty(desc, 'value')) {
            enqueue(desc.value);
           }else {
            enqueue(desc.get);
            enqueue(desc.set);
           }
         });
       };

      const freezeAndTraverse=
        FERAL_STACK_GETTER===  undefined&&  FERAL_STACK_SETTER===  undefined?
            // On platforms without v8's error own stack accessor problem,
            // don't pay for any extra overhead.
            baseFreezeAndTraverse:
            (obj)=>{
              if( isError(obj)) {
                // Only pay the overhead if it first passes this cheap isError
                // check. Otherwise, it will be unrepaired, but won't be judged
                // to be a passable error anyway, so will not be unsafe.
                const stackDesc=  getOwnPropertyDescriptor(obj, 'stack');
                if(
                  stackDesc&&
                  stackDesc.get===  FERAL_STACK_GETTER&&
                  stackDesc.configurable)
                  {
                  // Can only repair if it is configurable. Otherwise, leave
                  // unrepaired, in which case it will not be judged passable,
                  // avoiding a safety problem.
                  defineProperty(obj, 'stack', {
                    // NOTE: Calls getter during harden, which seems dangerous.
                    // But we're only calling the problematic getter whose
                    // hazards we think we understand.
                    // @ts-expect-error TS should know FERAL_STACK_GETTER
                    // cannot be `undefined` here.
                    // See https://github.com/endojs/endo/pull/2232#discussion_r1575179471
                    value: apply(FERAL_STACK_GETTER, obj, [])});

                 }
               }
              return baseFreezeAndTraverse(obj);
             };

      const dequeue=  ()=>  {
        // New values added before forEach() has finished will be visited.
        setForEach(toFreeze, freezeAndTraverse);
       };

      /** @param {any} value */
      const markHardened=  (value)=>{
        weaksetAdd(hardened, value);
       };

      const commit=  ()=>  {
        setForEach(toFreeze, markHardened);
       };

      enqueue(root);
      dequeue();
      // console.warn("toFreeze set:", toFreeze);
      commit();

      return root;
     }};


  return harden;
 };$h‍_once.makeHardener(makeHardener);
})()
,
// === functors[11] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let arrayPush;$h‍_imports([["./commons.js", [["arrayPush", [$h‍_a => (arrayPush = $h‍_a)]]]]]);   




/** @import {GenericErrorConstructor} from '../types.js' */

/**
 * @file Exports {@code whitelist}, a recursively defined
 * JSON record enumerating all intrinsics and their properties
 * according to ECMA specs.
 *
 * @author JF Paradis
 * @author Mark S. Miller
 */

/**
 * constantProperties
 * non-configurable, non-writable data properties of all global objects.
 * Must be powerless.
 * Maps from property name to the actual value
 */
const        constantProperties=  {
  // *** Value Properties of the Global Object

  Infinity,
  NaN,
  undefined};


/**
 * universalPropertyNames
 * Properties of all global objects.
 * Must be powerless.
 * Maps from property name to the intrinsic name in the whitelist.
 */$h‍_once.constantProperties(constantProperties);
const        universalPropertyNames=  {
  // *** Function Properties of the Global Object

  isFinite: 'isFinite',
  isNaN: 'isNaN',
  parseFloat: 'parseFloat',
  parseInt: 'parseInt',

  decodeURI: 'decodeURI',
  decodeURIComponent: 'decodeURIComponent',
  encodeURI: 'encodeURI',
  encodeURIComponent: 'encodeURIComponent',

  // *** Constructor Properties of the Global Object

  Array: 'Array',
  ArrayBuffer: 'ArrayBuffer',
  BigInt: 'BigInt',
  BigInt64Array: 'BigInt64Array',
  BigUint64Array: 'BigUint64Array',
  Boolean: 'Boolean',
  DataView: 'DataView',
  EvalError: 'EvalError',
  // https://github.com/tc39/proposal-float16array
  Float16Array: 'Float16Array',
  Float32Array: 'Float32Array',
  Float64Array: 'Float64Array',
  Int8Array: 'Int8Array',
  Int16Array: 'Int16Array',
  Int32Array: 'Int32Array',
  Map: 'Map',
  Number: 'Number',
  Object: 'Object',
  Promise: 'Promise',
  Proxy: 'Proxy',
  RangeError: 'RangeError',
  ReferenceError: 'ReferenceError',
  Set: 'Set',
  String: 'String',
  SyntaxError: 'SyntaxError',
  TypeError: 'TypeError',
  Uint8Array: 'Uint8Array',
  Uint8ClampedArray: 'Uint8ClampedArray',
  Uint16Array: 'Uint16Array',
  Uint32Array: 'Uint32Array',
  URIError: 'URIError',
  WeakMap: 'WeakMap',
  WeakSet: 'WeakSet',
  // https://github.com/tc39/proposal-iterator-helpers
  Iterator: 'Iterator',
  // https://github.com/tc39/proposal-async-iterator-helpers
  AsyncIterator: 'AsyncIterator',
  // https://github.com/endojs/endo/issues/550
  AggregateError: 'AggregateError',

  // *** Other Properties of the Global Object

  JSON: 'JSON',
  Reflect: 'Reflect',

  // *** Annex B

  escape: 'escape',
  unescape: 'unescape',

  // ESNext

  lockdown: 'lockdown',
  harden: 'harden',
  HandledPromise: 'HandledPromise'  // TODO: Until Promise.delegate (see below).
};

/**
 * initialGlobalPropertyNames
 * Those found only on the initial global, i.e., the global of the
 * start compartment, as well as any compartments created before lockdown.
 * These may provide much of the power provided by the original.
 * Maps from property name to the intrinsic name in the whitelist.
 */$h‍_once.universalPropertyNames(universalPropertyNames);
const        initialGlobalPropertyNames=  {
  // *** Constructor Properties of the Global Object

  Date: '%InitialDate%',
  Error: '%InitialError%',
  RegExp: '%InitialRegExp%',

  // Omit `Symbol`, because we want the original to appear on the
  // start compartment without passing through the whitelist mechanism, since
  // we want to preserve all its properties, even if we never heard of them.
  // Symbol: '%InitialSymbol%',

  // *** Other Properties of the Global Object

  Math: '%InitialMath%',

  // ESNext

  // From Error-stack proposal
  // Only on initial global. No corresponding
  // powerless form for other globals.
  getStackString: '%InitialGetStackString%'

  // TODO https://github.com/Agoric/SES-shim/issues/551
  // Need initial WeakRef and FinalizationGroup in
  // start compartment only.
};

/**
 * sharedGlobalPropertyNames
 * Those found only on the globals of new compartments created after lockdown,
 * which must therefore be powerless.
 * Maps from property name to the intrinsic name in the whitelist.
 */$h‍_once.initialGlobalPropertyNames(initialGlobalPropertyNames);
const        sharedGlobalPropertyNames=  {
  // *** Constructor Properties of the Global Object

  Date: '%SharedDate%',
  Error: '%SharedError%',
  RegExp: '%SharedRegExp%',
  Symbol: '%SharedSymbol%',

  // *** Other Properties of the Global Object

  Math: '%SharedMath%'};


/**
 * uniqueGlobalPropertyNames
 * Those made separately for each global, including the initial global
 * of the start compartment.
 * Maps from property name to the intrinsic name in the whitelist
 * (which is currently always the same).
 */$h‍_once.sharedGlobalPropertyNames(sharedGlobalPropertyNames);
const        uniqueGlobalPropertyNames=  {
  // *** Value Properties of the Global Object

  globalThis: '%UniqueGlobalThis%',

  // *** Function Properties of the Global Object

  eval: '%UniqueEval%',

  // *** Constructor Properties of the Global Object

  Function: '%UniqueFunction%',

  // *** Other Properties of the Global Object

  // ESNext

  Compartment: '%UniqueCompartment%'
  // According to current agreements, eventually the Realm constructor too.
  // 'Realm',
};

// All the "subclasses" of Error. These are collectively represented in the
// ECMAScript spec by the meta variable NativeError.
/** @type {GenericErrorConstructor[]} */$h‍_once.uniqueGlobalPropertyNames(uniqueGlobalPropertyNames);
const NativeErrors=  [
  EvalError,
  RangeError,
  ReferenceError,
  SyntaxError,
  TypeError,
  URIError
  // https://github.com/endojs/endo/issues/550
  // Commented out to accommodate platforms prior to AggregateError.
  // Instead, conditional push below.
  // AggregateError,
];$h‍_once.NativeErrors(NativeErrors);

if( typeof AggregateError!==  'undefined') {
  // Conditional, to accommodate platforms prior to AggregateError
  arrayPush(NativeErrors, AggregateError);
 }



/**
 * <p>Each JSON record enumerates the disposition of the properties on
 *    some corresponding intrinsic object.
 *
 * <p>All records are made of key-value pairs where the key
 *    is the property to process, and the value is the associated
 *    dispositions a.k.a. the "permit". Those permits can be:
 * <ul>
 * <li>The boolean value "false", in which case this property is
 *     blacklisted and simply removed. Properties not mentioned
 *     are also considered blacklisted and are removed.
 * <li>A string value equal to a primitive ("number", "string", etc),
 *     in which case the property is whitelisted if its value property
 *     is typeof the given type. For example, {@code "Infinity"} leads to
 *     "number" and property values that fail {@code typeof "number"}.
 *     are removed.
 * <li>A string value equal to an intinsic name ("ObjectPrototype",
 *     "Array", etc), in which case the property whitelisted if its
 *     value property is equal to the value of the corresponfing
 *     intrinsics. For example, {@code Map.prototype} leads to
 *     "MapPrototype" and the property is removed if its value is
 *     not equal to %MapPrototype%
 * <li>Another record, in which case this property is simply
 *     whitelisted and that next record represents the disposition of
 *     the object which is its value. For example, {@code "Object"}
 *     leads to another record explaining what properties {@code
 *     "Object"} may have and how each such property should be treated.
 *
 * <p>Notes:
 * <li>"[[Proto]]" is used to refer to the "[[Prototype]]" internal
 *     slot, which says which object this object inherits from.
 * <li>"--proto--" is used to refer to the "__proto__" property name,
 *     which is the name of an accessor property on Object.prototype.
 *     In practice, it is used to access the [[Proto]] internal slot,
 *     but is distinct from the internal slot itself. We use
 *     "--proto--" rather than "__proto__" below because "__proto__"
 *     in an object literal is special syntax rather than a normal
 *     property definition.
 * <li>"ObjectPrototype" is the default "[[Proto]]" (when not specified).
 * <li>Constants "fn" and "getter" are used to keep the structure DRY.
 * <li>Symbol properties are listed as follow:
 *     <li>Well-known symbols use the "@@name" form.
 *     <li>Registered symbols use the "RegisteredSymbol(key)" form.
 *     <li>Unique symbols use the "UniqueSymbol(description)" form.
 */

// Function Instances
const        FunctionInstance=  {
  '[[Proto]]': '%FunctionPrototype%',
  length: 'number',
  name: 'string'
  // Do not specify "prototype" here, since only Function instances that can
  // be used as a constructor have a prototype property. For constructors,
  // since prototype properties are instance-specific, we define it there.
};

// AsyncFunction Instances
$h‍_once.FunctionInstance(FunctionInstance);const AsyncFunctionInstance={
  // This property is not mentioned in ECMA 262, but is present in V8 and
  // necessary for lockdown to succeed.
  '[[Proto]]': '%AsyncFunctionPrototype%'};


// Aliases
$h‍_once.AsyncFunctionInstance(AsyncFunctionInstance);const fn=FunctionInstance;
const asyncFn=  AsyncFunctionInstance;

const getter=  {
  get: fn,
  set: 'undefined'};


// Possible but not encountered in the specs
// export const setter = {
//   get: 'undefined',
//   set: fn,
// };

const accessor=  {
  get: fn,
  set: fn};


const        isAccessorPermit=  (permit)=>{
  return permit===  getter||  permit===  accessor;
 };

// NativeError Object Structure
$h‍_once.isAccessorPermit(isAccessorPermit);function NativeError(prototype){
  return {
    // Properties of the NativeError Constructors
    '[[Proto]]': '%SharedError%',

    // NativeError.prototype
    prototype};

 }

function NativeErrorPrototype(constructor) {
  return {
    // Properties of the NativeError Prototype Objects
    '[[Proto]]': '%ErrorPrototype%',
    constructor,
    message: 'string',
    name: 'string',
    // Redundantly present only on v8. Safe to remove.
    toString: false,
    // Superfluously present in some versions of V8.
    // https://github.com/tc39/notes/blob/master/meetings/2021-10/oct-26.md#:~:text=However%2C%20Chrome%2093,and%20node%2016.11.
    cause: false};

 }

// The TypedArray Constructors
function TypedArray(prototype) {
  return {
    // Properties of the TypedArray Constructors
    '[[Proto]]': '%TypedArray%',
    BYTES_PER_ELEMENT: 'number',
    prototype};

 }

function TypedArrayPrototype(constructor) {
  return {
    // Properties of the TypedArray Prototype Objects
    '[[Proto]]': '%TypedArrayPrototype%',
    BYTES_PER_ELEMENT: 'number',
    constructor};

 }

// Without Math.random
const CommonMath=  {
  E: 'number',
  LN10: 'number',
  LN2: 'number',
  LOG10E: 'number',
  LOG2E: 'number',
  PI: 'number',
  SQRT1_2: 'number',
  SQRT2: 'number',
  '@@toStringTag': 'string',
  abs: fn,
  acos: fn,
  acosh: fn,
  asin: fn,
  asinh: fn,
  atan: fn,
  atanh: fn,
  atan2: fn,
  cbrt: fn,
  ceil: fn,
  clz32: fn,
  cos: fn,
  cosh: fn,
  exp: fn,
  expm1: fn,
  floor: fn,
  fround: fn,
  hypot: fn,
  imul: fn,
  log: fn,
  log1p: fn,
  log10: fn,
  log2: fn,
  max: fn,
  min: fn,
  pow: fn,
  round: fn,
  sign: fn,
  sin: fn,
  sinh: fn,
  sqrt: fn,
  tan: fn,
  tanh: fn,
  trunc: fn,
  // See https://github.com/Moddable-OpenSource/moddable/issues/523
  idiv: false,
  // See https://github.com/Moddable-OpenSource/moddable/issues/523
  idivmod: false,
  // See https://github.com/Moddable-OpenSource/moddable/issues/523
  imod: false,
  // See https://github.com/Moddable-OpenSource/moddable/issues/523
  imuldiv: false,
  // See https://github.com/Moddable-OpenSource/moddable/issues/523
  irem: false,
  // See https://github.com/Moddable-OpenSource/moddable/issues/523
  mod: false,
  // See https://github.com/Moddable-OpenSource/moddable/issues/523#issuecomment-1942904505
  irandom: false};


const        permitted=  {
  // ECMA https://tc39.es/ecma262

  // The intrinsics object has no prototype to avoid conflicts.
  '[[Proto]]': null,

  // %ThrowTypeError%
  '%ThrowTypeError%': fn,

  // *** The Global Object

  // *** Value Properties of the Global Object
  Infinity: 'number',
  NaN: 'number',
  undefined: 'undefined',

  // *** Function Properties of the Global Object

  // eval
  '%UniqueEval%': fn,
  isFinite: fn,
  isNaN: fn,
  parseFloat: fn,
  parseInt: fn,
  decodeURI: fn,
  decodeURIComponent: fn,
  encodeURI: fn,
  encodeURIComponent: fn,

  // *** Fundamental Objects

  Object: {
    // Properties of the Object Constructor
    '[[Proto]]': '%FunctionPrototype%',
    assign: fn,
    create: fn,
    defineProperties: fn,
    defineProperty: fn,
    entries: fn,
    freeze: fn,
    fromEntries: fn,
    getOwnPropertyDescriptor: fn,
    getOwnPropertyDescriptors: fn,
    getOwnPropertyNames: fn,
    getOwnPropertySymbols: fn,
    getPrototypeOf: fn,
    hasOwn: fn,
    is: fn,
    isExtensible: fn,
    isFrozen: fn,
    isSealed: fn,
    keys: fn,
    preventExtensions: fn,
    prototype: '%ObjectPrototype%',
    seal: fn,
    setPrototypeOf: fn,
    values: fn,
    // https://github.com/tc39/proposal-array-grouping
    groupBy: fn,
    // Seen on QuickJS
    __getClass: false},


  '%ObjectPrototype%': {
    // Properties of the Object Prototype Object
    '[[Proto]]': null,
    constructor: 'Object',
    hasOwnProperty: fn,
    isPrototypeOf: fn,
    propertyIsEnumerable: fn,
    toLocaleString: fn,
    toString: fn,
    valueOf: fn,

    // Annex B: Additional Properties of the Object.prototype Object

    // See note in header about the difference between [[Proto]] and --proto--
    // special notations.
    '--proto--': accessor,
    __defineGetter__: fn,
    __defineSetter__: fn,
    __lookupGetter__: fn,
    __lookupSetter__: fn},


  '%UniqueFunction%': {
    // Properties of the Function Constructor
    '[[Proto]]': '%FunctionPrototype%',
    prototype: '%FunctionPrototype%'},


  '%InertFunction%': {
    '[[Proto]]': '%FunctionPrototype%',
    prototype: '%FunctionPrototype%'},


  '%FunctionPrototype%': {
    apply: fn,
    bind: fn,
    call: fn,
    constructor: '%InertFunction%',
    toString: fn,
    '@@hasInstance': fn,
    // proposed but not yet std. To be removed if there
    caller: false,
    // proposed but not yet std. To be removed if there
    arguments: false,
    // Seen on QuickJS. TODO grab getter for use by console
    fileName: false,
    // Seen on QuickJS. TODO grab getter for use by console
    lineNumber: false},


  Boolean: {
    // Properties of the Boolean Constructor
    '[[Proto]]': '%FunctionPrototype%',
    prototype: '%BooleanPrototype%'},


  '%BooleanPrototype%': {
    constructor: 'Boolean',
    toString: fn,
    valueOf: fn},


  '%SharedSymbol%': {
    // Properties of the Symbol Constructor
    '[[Proto]]': '%FunctionPrototype%',
    asyncDispose: 'symbol',
    asyncIterator: 'symbol',
    dispose: 'symbol',
    for: fn,
    hasInstance: 'symbol',
    isConcatSpreadable: 'symbol',
    iterator: 'symbol',
    keyFor: fn,
    match: 'symbol',
    matchAll: 'symbol',
    prototype: '%SymbolPrototype%',
    replace: 'symbol',
    search: 'symbol',
    species: 'symbol',
    split: 'symbol',
    toPrimitive: 'symbol',
    toStringTag: 'symbol',
    unscopables: 'symbol',
    // Seen at core-js https://github.com/zloirock/core-js#ecmascript-symbol
    useSimple: false,
    // Seen at core-js https://github.com/zloirock/core-js#ecmascript-symbol
    useSetter: false,
    // Seen on QuickJS
    operatorSet: false},


  '%SymbolPrototype%': {
    // Properties of the Symbol Prototype Object
    constructor: '%SharedSymbol%',
    description: getter,
    toString: fn,
    valueOf: fn,
    '@@toPrimitive': fn,
    '@@toStringTag': 'string'},


  '%InitialError%': {
    // Properties of the Error Constructor
    '[[Proto]]': '%FunctionPrototype%',
    prototype: '%ErrorPrototype%',
    // Non standard, v8 only, used by tap
    captureStackTrace: fn,
    // Non standard, v8 only, used by tap, tamed to accessor
    stackTraceLimit: accessor,
    // Non standard, v8 only, used by several, tamed to accessor
    prepareStackTrace: accessor},


  '%SharedError%': {
    // Properties of the Error Constructor
    '[[Proto]]': '%FunctionPrototype%',
    prototype: '%ErrorPrototype%',
    // Non standard, v8 only, used by tap
    captureStackTrace: fn,
    // Non standard, v8 only, used by tap, tamed to accessor
    stackTraceLimit: accessor,
    // Non standard, v8 only, used by several, tamed to accessor
    prepareStackTrace: accessor},


  '%ErrorPrototype%': {
    constructor: '%SharedError%',
    message: 'string',
    name: 'string',
    toString: fn,
    // proposed de-facto, assumed TODO
    // Seen on FF Nightly 88.0a1
    at: false,
    // Seen on FF and XS
    stack: accessor,
    // Superfluously present in some versions of V8.
    // https://github.com/tc39/notes/blob/master/meetings/2021-10/oct-26.md#:~:text=However%2C%20Chrome%2093,and%20node%2016.11.
    cause: false},


  // NativeError

  EvalError: NativeError('%EvalErrorPrototype%'),
  RangeError: NativeError('%RangeErrorPrototype%'),
  ReferenceError: NativeError('%ReferenceErrorPrototype%'),
  SyntaxError: NativeError('%SyntaxErrorPrototype%'),
  TypeError: NativeError('%TypeErrorPrototype%'),
  URIError: NativeError('%URIErrorPrototype%'),
  // https://github.com/endojs/endo/issues/550
  AggregateError: NativeError('%AggregateErrorPrototype%'),

  '%EvalErrorPrototype%': NativeErrorPrototype('EvalError'),
  '%RangeErrorPrototype%': NativeErrorPrototype('RangeError'),
  '%ReferenceErrorPrototype%': NativeErrorPrototype('ReferenceError'),
  '%SyntaxErrorPrototype%': NativeErrorPrototype('SyntaxError'),
  '%TypeErrorPrototype%': NativeErrorPrototype('TypeError'),
  '%URIErrorPrototype%': NativeErrorPrototype('URIError'),
  // https://github.com/endojs/endo/issues/550
  '%AggregateErrorPrototype%': NativeErrorPrototype('AggregateError'),

  // *** Numbers and Dates

  Number: {
    // Properties of the Number Constructor
    '[[Proto]]': '%FunctionPrototype%',
    EPSILON: 'number',
    isFinite: fn,
    isInteger: fn,
    isNaN: fn,
    isSafeInteger: fn,
    MAX_SAFE_INTEGER: 'number',
    MAX_VALUE: 'number',
    MIN_SAFE_INTEGER: 'number',
    MIN_VALUE: 'number',
    NaN: 'number',
    NEGATIVE_INFINITY: 'number',
    parseFloat: fn,
    parseInt: fn,
    POSITIVE_INFINITY: 'number',
    prototype: '%NumberPrototype%'},


  '%NumberPrototype%': {
    // Properties of the Number Prototype Object
    constructor: 'Number',
    toExponential: fn,
    toFixed: fn,
    toLocaleString: fn,
    toPrecision: fn,
    toString: fn,
    valueOf: fn},


  BigInt: {
    // Properties of the BigInt Constructor
    '[[Proto]]': '%FunctionPrototype%',
    asIntN: fn,
    asUintN: fn,
    prototype: '%BigIntPrototype%',
    // See https://github.com/Moddable-OpenSource/moddable/issues/523
    bitLength: false,
    // See https://github.com/Moddable-OpenSource/moddable/issues/523
    fromArrayBuffer: false,
    // Seen on QuickJS
    tdiv: false,
    // Seen on QuickJS
    fdiv: false,
    // Seen on QuickJS
    cdiv: false,
    // Seen on QuickJS
    ediv: false,
    // Seen on QuickJS
    tdivrem: false,
    // Seen on QuickJS
    fdivrem: false,
    // Seen on QuickJS
    cdivrem: false,
    // Seen on QuickJS
    edivrem: false,
    // Seen on QuickJS
    sqrt: false,
    // Seen on QuickJS
    sqrtrem: false,
    // Seen on QuickJS
    floorLog2: false,
    // Seen on QuickJS
    ctz: false},


  '%BigIntPrototype%': {
    constructor: 'BigInt',
    toLocaleString: fn,
    toString: fn,
    valueOf: fn,
    '@@toStringTag': 'string'},


  '%InitialMath%': {
    ...CommonMath,
    // `%InitialMath%.random()` has the standard unsafe behavior
    random: fn},


  '%SharedMath%': {
    ...CommonMath,
    // `%SharedMath%.random()` is tamed to always throw
    random: fn},


  '%InitialDate%': {
    // Properties of the Date Constructor
    '[[Proto]]': '%FunctionPrototype%',
    now: fn,
    parse: fn,
    prototype: '%DatePrototype%',
    UTC: fn},


  '%SharedDate%': {
    // Properties of the Date Constructor
    '[[Proto]]': '%FunctionPrototype%',
    // `%SharedDate%.now()` is tamed to always throw
    now: fn,
    parse: fn,
    prototype: '%DatePrototype%',
    UTC: fn},


  '%DatePrototype%': {
    constructor: '%SharedDate%',
    getDate: fn,
    getDay: fn,
    getFullYear: fn,
    getHours: fn,
    getMilliseconds: fn,
    getMinutes: fn,
    getMonth: fn,
    getSeconds: fn,
    getTime: fn,
    getTimezoneOffset: fn,
    getUTCDate: fn,
    getUTCDay: fn,
    getUTCFullYear: fn,
    getUTCHours: fn,
    getUTCMilliseconds: fn,
    getUTCMinutes: fn,
    getUTCMonth: fn,
    getUTCSeconds: fn,
    setDate: fn,
    setFullYear: fn,
    setHours: fn,
    setMilliseconds: fn,
    setMinutes: fn,
    setMonth: fn,
    setSeconds: fn,
    setTime: fn,
    setUTCDate: fn,
    setUTCFullYear: fn,
    setUTCHours: fn,
    setUTCMilliseconds: fn,
    setUTCMinutes: fn,
    setUTCMonth: fn,
    setUTCSeconds: fn,
    toDateString: fn,
    toISOString: fn,
    toJSON: fn,
    toLocaleDateString: fn,
    toLocaleString: fn,
    toLocaleTimeString: fn,
    toString: fn,
    toTimeString: fn,
    toUTCString: fn,
    valueOf: fn,
    '@@toPrimitive': fn,

    // Annex B: Additional Properties of the Date.prototype Object
    getYear: fn,
    setYear: fn,
    toGMTString: fn},


  // Text Processing

  String: {
    // Properties of the String Constructor
    '[[Proto]]': '%FunctionPrototype%',
    fromCharCode: fn,
    fromCodePoint: fn,
    prototype: '%StringPrototype%',
    raw: fn,
    // See https://github.com/Moddable-OpenSource/moddable/issues/523
    fromArrayBuffer: false},


  '%StringPrototype%': {
    // Properties of the String Prototype Object
    length: 'number',
    at: fn,
    charAt: fn,
    charCodeAt: fn,
    codePointAt: fn,
    concat: fn,
    constructor: 'String',
    endsWith: fn,
    includes: fn,
    indexOf: fn,
    lastIndexOf: fn,
    localeCompare: fn,
    match: fn,
    matchAll: fn,
    normalize: fn,
    padEnd: fn,
    padStart: fn,
    repeat: fn,
    replace: fn,
    replaceAll: fn, // ES2021
    search: fn,
    slice: fn,
    split: fn,
    startsWith: fn,
    substring: fn,
    toLocaleLowerCase: fn,
    toLocaleUpperCase: fn,
    toLowerCase: fn,
    toString: fn,
    toUpperCase: fn,
    trim: fn,
    trimEnd: fn,
    trimStart: fn,
    valueOf: fn,
    '@@iterator': fn,

    // Annex B: Additional Properties of the String.prototype Object
    substr: fn,
    anchor: fn,
    big: fn,
    blink: fn,
    bold: fn,
    fixed: fn,
    fontcolor: fn,
    fontsize: fn,
    italics: fn,
    link: fn,
    small: fn,
    strike: fn,
    sub: fn,
    sup: fn,
    trimLeft: fn,
    trimRight: fn,
    // See https://github.com/Moddable-OpenSource/moddable/issues/523
    compare: false,
    // https://github.com/tc39/proposal-is-usv-string
    isWellFormed: fn,
    toWellFormed: fn,
    unicodeSets: fn,
    // Seen on QuickJS
    __quote: false},


  '%StringIteratorPrototype%': {
    '[[Proto]]': '%IteratorPrototype%',
    next: fn,
    '@@toStringTag': 'string'},


  '%InitialRegExp%': {
    // Properties of the RegExp Constructor
    '[[Proto]]': '%FunctionPrototype%',
    prototype: '%RegExpPrototype%',
    '@@species': getter,

    // The https://github.com/tc39/proposal-regexp-legacy-features
    // are all optional, unsafe, and omitted
    input: false,
    $_: false,
    lastMatch: false,
    '$&': false,
    lastParen: false,
    '$+': false,
    leftContext: false,
    '$`': false,
    rightContext: false,
    "$'": false,
    $1: false,
    $2: false,
    $3: false,
    $4: false,
    $5: false,
    $6: false,
    $7: false,
    $8: false,
    $9: false},


  '%SharedRegExp%': {
    // Properties of the RegExp Constructor
    '[[Proto]]': '%FunctionPrototype%',
    prototype: '%RegExpPrototype%',
    '@@species': getter},


  '%RegExpPrototype%': {
    // Properties of the RegExp Prototype Object
    constructor: '%SharedRegExp%',
    exec: fn,
    dotAll: getter,
    flags: getter,
    global: getter,
    hasIndices: getter,
    ignoreCase: getter,
    '@@match': fn,
    '@@matchAll': fn,
    multiline: getter,
    '@@replace': fn,
    '@@search': fn,
    source: getter,
    '@@split': fn,
    sticky: getter,
    test: fn,
    toString: fn,
    unicode: getter,
    unicodeSets: getter,

    // Annex B: Additional Properties of the RegExp.prototype Object
    compile: false  // UNSAFE and suppressed.
},

  '%RegExpStringIteratorPrototype%': {
    // The %RegExpStringIteratorPrototype% Object
    '[[Proto]]': '%IteratorPrototype%',
    next: fn,
    '@@toStringTag': 'string'},


  // Indexed Collections

  Array: {
    // Properties of the Array Constructor
    '[[Proto]]': '%FunctionPrototype%',
    from: fn,
    isArray: fn,
    of: fn,
    prototype: '%ArrayPrototype%',
    '@@species': getter,

    // Stage 3:
    // https://tc39.es/proposal-relative-indexing-method/
    at: fn,
    // https://tc39.es/proposal-array-from-async/
    fromAsync: fn},


  '%ArrayPrototype%': {
    // Properties of the Array Prototype Object
    at: fn,
    length: 'number',
    concat: fn,
    constructor: 'Array',
    copyWithin: fn,
    entries: fn,
    every: fn,
    fill: fn,
    filter: fn,
    find: fn,
    findIndex: fn,
    flat: fn,
    flatMap: fn,
    forEach: fn,
    includes: fn,
    indexOf: fn,
    join: fn,
    keys: fn,
    lastIndexOf: fn,
    map: fn,
    pop: fn,
    push: fn,
    reduce: fn,
    reduceRight: fn,
    reverse: fn,
    shift: fn,
    slice: fn,
    some: fn,
    sort: fn,
    splice: fn,
    toLocaleString: fn,
    toString: fn,
    unshift: fn,
    values: fn,
    '@@iterator': fn,
    '@@unscopables': {
      '[[Proto]]': null,
      copyWithin: 'boolean',
      entries: 'boolean',
      fill: 'boolean',
      find: 'boolean',
      findIndex: 'boolean',
      flat: 'boolean',
      flatMap: 'boolean',
      includes: 'boolean',
      keys: 'boolean',
      values: 'boolean',
      // Failed tc39 proposal
      // Seen on FF Nightly 88.0a1
      at: 'boolean',
      // See https://github.com/tc39/proposal-array-find-from-last
      findLast: 'boolean',
      findLastIndex: 'boolean',
      // https://github.com/tc39/proposal-change-array-by-copy
      toReversed: 'boolean',
      toSorted: 'boolean',
      toSpliced: 'boolean',
      with: 'boolean',
      // https://github.com/tc39/proposal-array-grouping
      group: 'boolean',
      groupToMap: 'boolean',
      groupBy: 'boolean'},

    // See https://github.com/tc39/proposal-array-find-from-last
    findLast: fn,
    findLastIndex: fn,
    // https://github.com/tc39/proposal-change-array-by-copy
    toReversed: fn,
    toSorted: fn,
    toSpliced: fn,
    with: fn,
    // https://github.com/tc39/proposal-array-grouping
    group: fn, // Not in proposal? Where?
    groupToMap: fn, // Not in proposal? Where?
    groupBy: fn},


  '%ArrayIteratorPrototype%': {
    // The %ArrayIteratorPrototype% Object
    '[[Proto]]': '%IteratorPrototype%',
    next: fn,
    '@@toStringTag': 'string'},


  // *** TypedArray Objects

  '%TypedArray%': {
    // Properties of the %TypedArray% Intrinsic Object
    '[[Proto]]': '%FunctionPrototype%',
    from: fn,
    of: fn,
    prototype: '%TypedArrayPrototype%',
    '@@species': getter},


  '%TypedArrayPrototype%': {
    at: fn,
    buffer: getter,
    byteLength: getter,
    byteOffset: getter,
    constructor: '%TypedArray%',
    copyWithin: fn,
    entries: fn,
    every: fn,
    fill: fn,
    filter: fn,
    find: fn,
    findIndex: fn,
    forEach: fn,
    includes: fn,
    indexOf: fn,
    join: fn,
    keys: fn,
    lastIndexOf: fn,
    length: getter,
    map: fn,
    reduce: fn,
    reduceRight: fn,
    reverse: fn,
    set: fn,
    slice: fn,
    some: fn,
    sort: fn,
    subarray: fn,
    toLocaleString: fn,
    toString: fn,
    values: fn,
    '@@iterator': fn,
    '@@toStringTag': getter,
    // See https://github.com/tc39/proposal-array-find-from-last
    findLast: fn,
    findLastIndex: fn,
    // https://github.com/tc39/proposal-change-array-by-copy
    toReversed: fn,
    toSorted: fn,
    with: fn},


  // The TypedArray Constructors

  BigInt64Array: TypedArray('%BigInt64ArrayPrototype%'),
  BigUint64Array: TypedArray('%BigUint64ArrayPrototype%'),
  // https://github.com/tc39/proposal-float16array
  Float16Array: TypedArray('%Float16ArrayPrototype%'),
  Float32Array: TypedArray('%Float32ArrayPrototype%'),
  Float64Array: TypedArray('%Float64ArrayPrototype%'),
  Int16Array: TypedArray('%Int16ArrayPrototype%'),
  Int32Array: TypedArray('%Int32ArrayPrototype%'),
  Int8Array: TypedArray('%Int8ArrayPrototype%'),
  Uint16Array: TypedArray('%Uint16ArrayPrototype%'),
  Uint32Array: TypedArray('%Uint32ArrayPrototype%'),
  Uint8Array: TypedArray('%Uint8ArrayPrototype%'),
  Uint8ClampedArray: TypedArray('%Uint8ClampedArrayPrototype%'),

  '%BigInt64ArrayPrototype%': TypedArrayPrototype('BigInt64Array'),
  '%BigUint64ArrayPrototype%': TypedArrayPrototype('BigUint64Array'),
  // https://github.com/tc39/proposal-float16array
  '%Float16ArrayPrototype%': TypedArrayPrototype('Float16Array'),
  '%Float32ArrayPrototype%': TypedArrayPrototype('Float32Array'),
  '%Float64ArrayPrototype%': TypedArrayPrototype('Float64Array'),
  '%Int16ArrayPrototype%': TypedArrayPrototype('Int16Array'),
  '%Int32ArrayPrototype%': TypedArrayPrototype('Int32Array'),
  '%Int8ArrayPrototype%': TypedArrayPrototype('Int8Array'),
  '%Uint16ArrayPrototype%': TypedArrayPrototype('Uint16Array'),
  '%Uint32ArrayPrototype%': TypedArrayPrototype('Uint32Array'),
  '%Uint8ArrayPrototype%': TypedArrayPrototype('Uint8Array'),
  '%Uint8ClampedArrayPrototype%': TypedArrayPrototype('Uint8ClampedArray'),

  // *** Keyed Collections

  Map: {
    // Properties of the Map Constructor
    '[[Proto]]': '%FunctionPrototype%',
    '@@species': getter,
    prototype: '%MapPrototype%',
    // https://github.com/tc39/proposal-array-grouping
    groupBy: fn},


  '%MapPrototype%': {
    clear: fn,
    constructor: 'Map',
    delete: fn,
    entries: fn,
    forEach: fn,
    get: fn,
    has: fn,
    keys: fn,
    set: fn,
    size: getter,
    values: fn,
    '@@iterator': fn,
    '@@toStringTag': 'string'},


  '%MapIteratorPrototype%': {
    // The %MapIteratorPrototype% Object
    '[[Proto]]': '%IteratorPrototype%',
    next: fn,
    '@@toStringTag': 'string'},


  Set: {
    // Properties of the Set Constructor
    '[[Proto]]': '%FunctionPrototype%',
    prototype: '%SetPrototype%',
    '@@species': getter,
    // Seen on QuickJS
    groupBy: false},


  '%SetPrototype%': {
    add: fn,
    clear: fn,
    constructor: 'Set',
    delete: fn,
    entries: fn,
    forEach: fn,
    has: fn,
    keys: fn,
    size: getter,
    values: fn,
    '@@iterator': fn,
    '@@toStringTag': 'string',
    // See https://github.com/tc39/proposal-set-methods
    intersection: fn,
    // See https://github.com/tc39/proposal-set-methods
    union: fn,
    // See https://github.com/tc39/proposal-set-methods
    difference: fn,
    // See https://github.com/tc39/proposal-set-methods
    symmetricDifference: fn,
    // See https://github.com/tc39/proposal-set-methods
    isSubsetOf: fn,
    // See https://github.com/tc39/proposal-set-methods
    isSupersetOf: fn,
    // See https://github.com/tc39/proposal-set-methods
    isDisjointFrom: fn},


  '%SetIteratorPrototype%': {
    // The %SetIteratorPrototype% Object
    '[[Proto]]': '%IteratorPrototype%',
    next: fn,
    '@@toStringTag': 'string'},


  WeakMap: {
    // Properties of the WeakMap Constructor
    '[[Proto]]': '%FunctionPrototype%',
    prototype: '%WeakMapPrototype%'},


  '%WeakMapPrototype%': {
    constructor: 'WeakMap',
    delete: fn,
    get: fn,
    has: fn,
    set: fn,
    '@@toStringTag': 'string'},


  WeakSet: {
    // Properties of the WeakSet Constructor
    '[[Proto]]': '%FunctionPrototype%',
    prototype: '%WeakSetPrototype%'},


  '%WeakSetPrototype%': {
    add: fn,
    constructor: 'WeakSet',
    delete: fn,
    has: fn,
    '@@toStringTag': 'string'},


  // *** Structured Data

  ArrayBuffer: {
    // Properties of the ArrayBuffer Constructor
    '[[Proto]]': '%FunctionPrototype%',
    isView: fn,
    prototype: '%ArrayBufferPrototype%',
    '@@species': getter,
    // See https://github.com/Moddable-OpenSource/moddable/issues/523
    fromString: false,
    // See https://github.com/Moddable-OpenSource/moddable/issues/523
    fromBigInt: false},


  '%ArrayBufferPrototype%': {
    byteLength: getter,
    constructor: 'ArrayBuffer',
    slice: fn,
    '@@toStringTag': 'string',
    // See https://github.com/Moddable-OpenSource/moddable/issues/523
    concat: false,
    // See https://github.com/tc39/proposal-resizablearraybuffer
    transfer: fn,
    resize: fn,
    resizable: getter,
    maxByteLength: getter,
    // https://github.com/tc39/proposal-arraybuffer-transfer
    transferToFixedLength: fn,
    detached: getter},


  // SharedArrayBuffer Objects
  SharedArrayBuffer: false, // UNSAFE and purposely suppressed.
  '%SharedArrayBufferPrototype%': false, // UNSAFE and purposely suppressed.

  DataView: {
    // Properties of the DataView Constructor
    '[[Proto]]': '%FunctionPrototype%',
    BYTES_PER_ELEMENT: 'number', // Non std but undeletable on Safari.
    prototype: '%DataViewPrototype%'},


  '%DataViewPrototype%': {
    buffer: getter,
    byteLength: getter,
    byteOffset: getter,
    constructor: 'DataView',
    getBigInt64: fn,
    getBigUint64: fn,
    // https://github.com/tc39/proposal-float16array
    getFloat16: fn,
    getFloat32: fn,
    getFloat64: fn,
    getInt8: fn,
    getInt16: fn,
    getInt32: fn,
    getUint8: fn,
    getUint16: fn,
    getUint32: fn,
    setBigInt64: fn,
    setBigUint64: fn,
    // https://github.com/tc39/proposal-float16array
    setFloat16: fn,
    setFloat32: fn,
    setFloat64: fn,
    setInt8: fn,
    setInt16: fn,
    setInt32: fn,
    setUint8: fn,
    setUint16: fn,
    setUint32: fn,
    '@@toStringTag': 'string'},


  // Atomics
  Atomics: false, // UNSAFE and suppressed.

  JSON: {
    parse: fn,
    stringify: fn,
    '@@toStringTag': 'string',
    // https://github.com/tc39/proposal-json-parse-with-source/
    rawJSON: fn,
    isRawJSON: fn},


  // *** Control Abstraction Objects

  // https://github.com/tc39/proposal-iterator-helpers
  Iterator: {
    // Properties of the Iterator Constructor
    '[[Proto]]': '%FunctionPrototype%',
    prototype: '%IteratorPrototype%',
    from: fn},


  '%IteratorPrototype%': {
    // The %IteratorPrototype% Object
    '@@iterator': fn,
    // https://github.com/tc39/proposal-iterator-helpers
    constructor: 'Iterator',
    map: fn,
    filter: fn,
    take: fn,
    drop: fn,
    flatMap: fn,
    reduce: fn,
    toArray: fn,
    forEach: fn,
    some: fn,
    every: fn,
    find: fn,
    '@@toStringTag': 'string',
    // https://github.com/tc39/proposal-async-iterator-helpers
    toAsync: fn,
    // See https://github.com/Moddable-OpenSource/moddable/issues/523#issuecomment-1942904505
    '@@dispose': false},


  // https://github.com/tc39/proposal-iterator-helpers
  '%WrapForValidIteratorPrototype%': {
    '[[Proto]]': '%IteratorPrototype%',
    next: fn,
    return: fn},


  // https://github.com/tc39/proposal-iterator-helpers
  '%IteratorHelperPrototype%': {
    '[[Proto]]': '%IteratorPrototype%',
    next: fn,
    return: fn,
    '@@toStringTag': 'string'},


  // https://github.com/tc39/proposal-async-iterator-helpers
  AsyncIterator: {
    // Properties of the Iterator Constructor
    '[[Proto]]': '%FunctionPrototype%',
    prototype: '%AsyncIteratorPrototype%',
    from: fn},


  '%AsyncIteratorPrototype%': {
    // The %AsyncIteratorPrototype% Object
    '@@asyncIterator': fn,
    // https://github.com/tc39/proposal-async-iterator-helpers
    constructor: 'AsyncIterator',
    map: fn,
    filter: fn,
    take: fn,
    drop: fn,
    flatMap: fn,
    reduce: fn,
    toArray: fn,
    forEach: fn,
    some: fn,
    every: fn,
    find: fn,
    '@@toStringTag': 'string',
    // See https://github.com/Moddable-OpenSource/moddable/issues/523#issuecomment-1942904505
    '@@asyncDispose': false},


  // https://github.com/tc39/proposal-async-iterator-helpers
  '%WrapForValidAsyncIteratorPrototype%': {
    '[[Proto]]': '%AsyncIteratorPrototype%',
    next: fn,
    return: fn},


  // https://github.com/tc39/proposal-async-iterator-helpers
  '%AsyncIteratorHelperPrototype%': {
    '[[Proto]]': '%AsyncIteratorPrototype%',
    next: fn,
    return: fn,
    '@@toStringTag': 'string'},


  '%InertGeneratorFunction%': {
    // Properties of the GeneratorFunction Constructor
    '[[Proto]]': '%InertFunction%',
    prototype: '%Generator%'},


  '%Generator%': {
    // Properties of the GeneratorFunction Prototype Object
    '[[Proto]]': '%FunctionPrototype%',
    constructor: '%InertGeneratorFunction%',
    prototype: '%GeneratorPrototype%',
    '@@toStringTag': 'string'},


  '%InertAsyncGeneratorFunction%': {
    // Properties of the AsyncGeneratorFunction Constructor
    '[[Proto]]': '%InertFunction%',
    prototype: '%AsyncGenerator%'},


  '%AsyncGenerator%': {
    // Properties of the AsyncGeneratorFunction Prototype Object
    '[[Proto]]': '%FunctionPrototype%',
    constructor: '%InertAsyncGeneratorFunction%',
    prototype: '%AsyncGeneratorPrototype%',
    // length prop added here for React Native jsc-android
    // https://github.com/endojs/endo/issues/660
    // https://github.com/react-native-community/jsc-android-buildscripts/issues/181
    length: 'number',
    '@@toStringTag': 'string'},


  '%GeneratorPrototype%': {
    // Properties of the Generator Prototype Object
    '[[Proto]]': '%IteratorPrototype%',
    constructor: '%Generator%',
    next: fn,
    return: fn,
    throw: fn,
    '@@toStringTag': 'string'},


  '%AsyncGeneratorPrototype%': {
    // Properties of the AsyncGenerator Prototype Object
    '[[Proto]]': '%AsyncIteratorPrototype%',
    constructor: '%AsyncGenerator%',
    next: fn,
    return: fn,
    throw: fn,
    '@@toStringTag': 'string'},


  // TODO: To be replaced with Promise.delegate
  //
  // The HandledPromise global variable shimmed by `@agoric/eventual-send/shim`
  // implements an initial version of the eventual send specification at:
  // https://github.com/tc39/proposal-eventual-send
  //
  // We will likely change this to add a property to Promise called
  // Promise.delegate and put static methods on it, which will necessitate
  // another whitelist change to update to the current proposed standard.
  HandledPromise: {
    '[[Proto]]': 'Promise',
    applyFunction: fn,
    applyFunctionSendOnly: fn,
    applyMethod: fn,
    applyMethodSendOnly: fn,
    get: fn,
    getSendOnly: fn,
    prototype: '%PromisePrototype%',
    resolve: fn},


  Promise: {
    // Properties of the Promise Constructor
    '[[Proto]]': '%FunctionPrototype%',
    all: fn,
    allSettled: fn,
    // https://github.com/Agoric/SES-shim/issues/550
    any: fn,
    prototype: '%PromisePrototype%',
    race: fn,
    reject: fn,
    resolve: fn,
    // https://github.com/tc39/proposal-promise-with-resolvers
    withResolvers: fn,
    '@@species': getter},


  '%PromisePrototype%': {
    // Properties of the Promise Prototype Object
    catch: fn,
    constructor: 'Promise',
    finally: fn,
    then: fn,
    '@@toStringTag': 'string',
    // Non-standard, used in node to prevent async_hooks from breaking
    'UniqueSymbol(async_id_symbol)': accessor,
    'UniqueSymbol(trigger_async_id_symbol)': accessor,
    'UniqueSymbol(destroyed)': accessor},


  '%InertAsyncFunction%': {
    // Properties of the AsyncFunction Constructor
    '[[Proto]]': '%InertFunction%',
    prototype: '%AsyncFunctionPrototype%'},


  '%AsyncFunctionPrototype%': {
    // Properties of the AsyncFunction Prototype Object
    '[[Proto]]': '%FunctionPrototype%',
    constructor: '%InertAsyncFunction%',
    // length prop added here for React Native jsc-android
    // https://github.com/endojs/endo/issues/660
    // https://github.com/react-native-community/jsc-android-buildscripts/issues/181
    length: 'number',
    '@@toStringTag': 'string'},


  // Reflection

  Reflect: {
    // The Reflect Object
    // Not a function object.
    apply: fn,
    construct: fn,
    defineProperty: fn,
    deleteProperty: fn,
    get: fn,
    getOwnPropertyDescriptor: fn,
    getPrototypeOf: fn,
    has: fn,
    isExtensible: fn,
    ownKeys: fn,
    preventExtensions: fn,
    set: fn,
    setPrototypeOf: fn,
    '@@toStringTag': 'string'},


  Proxy: {
    // Properties of the Proxy Constructor
    '[[Proto]]': '%FunctionPrototype%',
    revocable: fn},


  // Appendix B

  // Annex B: Additional Properties of the Global Object

  escape: fn,
  unescape: fn,

  // Proposed

  '%UniqueCompartment%': {
    '[[Proto]]': '%FunctionPrototype%',
    prototype: '%CompartmentPrototype%',
    toString: fn},


  '%InertCompartment%': {
    '[[Proto]]': '%FunctionPrototype%',
    prototype: '%CompartmentPrototype%',
    toString: fn},


  '%CompartmentPrototype%': {
    constructor: '%InertCompartment%',
    evaluate: fn,
    globalThis: getter,
    name: getter,
    import: asyncFn,
    load: asyncFn,
    importNow: fn,
    module: fn,
    '@@toStringTag': 'string'},


  lockdown: fn,
  harden: { ...fn, isFake: 'boolean'},

  '%InitialGetStackString%': fn};$h‍_once.permitted(permitted);
})()
,
// === functors[12] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let TypeError,WeakSet,arrayFilter,create,defineProperty,entries,freeze,getOwnPropertyDescriptor,getOwnPropertyDescriptors,globalThis,is,isObject,objectHasOwnProperty,values,weaksetHas,constantProperties,sharedGlobalPropertyNames,universalPropertyNames,permitted;$h‍_imports([["./commons.js", [["TypeError", [$h‍_a => (TypeError = $h‍_a)]],["WeakSet", [$h‍_a => (WeakSet = $h‍_a)]],["arrayFilter", [$h‍_a => (arrayFilter = $h‍_a)]],["create", [$h‍_a => (create = $h‍_a)]],["defineProperty", [$h‍_a => (defineProperty = $h‍_a)]],["entries", [$h‍_a => (entries = $h‍_a)]],["freeze", [$h‍_a => (freeze = $h‍_a)]],["getOwnPropertyDescriptor", [$h‍_a => (getOwnPropertyDescriptor = $h‍_a)]],["getOwnPropertyDescriptors", [$h‍_a => (getOwnPropertyDescriptors = $h‍_a)]],["globalThis", [$h‍_a => (globalThis = $h‍_a)]],["is", [$h‍_a => (is = $h‍_a)]],["isObject", [$h‍_a => (isObject = $h‍_a)]],["objectHasOwnProperty", [$h‍_a => (objectHasOwnProperty = $h‍_a)]],["values", [$h‍_a => (values = $h‍_a)]],["weaksetHas", [$h‍_a => (weaksetHas = $h‍_a)]]]],["./permits.js", [["constantProperties", [$h‍_a => (constantProperties = $h‍_a)]],["sharedGlobalPropertyNames", [$h‍_a => (sharedGlobalPropertyNames = $h‍_a)]],["universalPropertyNames", [$h‍_a => (universalPropertyNames = $h‍_a)]],["permitted", [$h‍_a => (permitted = $h‍_a)]]]]]);   
























const isFunction=  (obj)=>typeof obj===  'function';

// Like defineProperty, but throws if it would modify an existing property.
// We use this to ensure that two conflicting attempts to define the same
// property throws, causing SES initialization to fail. Otherwise, a
// conflict between, for example, two of SES's internal whitelists might
// get masked as one overwrites the other. Accordingly, the thrown error
// complains of a "Conflicting definition".
function initProperty(obj, name, desc) {
  if( objectHasOwnProperty(obj, name)) {
    const preDesc=  getOwnPropertyDescriptor(obj, name);
    if(
      !preDesc||
      !is(preDesc.value, desc.value)||
      preDesc.get!==  desc.get||
      preDesc.set!==  desc.set||
      preDesc.writable!==  desc.writable||
      preDesc.enumerable!==  desc.enumerable||
      preDesc.configurable!==  desc.configurable)
      {
      throw TypeError( `Conflicting definitions of ${name}`);
     }
   }
  defineProperty(obj, name, desc);
 }

// Like defineProperties, but throws if it would modify an existing property.
// This ensures that the intrinsics added to the intrinsics collector object
// graph do not overlap.
function initProperties(obj, descs) {
  for( const [name, desc]of  entries(descs)) {
    initProperty(obj, name, desc);
   }
 }

// sampleGlobals creates an intrinsics object, suitable for
// interinsicsCollector.addIntrinsics, from the named properties of a global
// object.
function sampleGlobals(globalObject, newPropertyNames) {
  const newIntrinsics=  { __proto__: null};
  for( const [globalName, intrinsicName]of  entries(newPropertyNames)) {
    if( objectHasOwnProperty(globalObject, globalName)) {
      newIntrinsics[intrinsicName]=  globalObject[globalName];
     }
   }
  return newIntrinsics;
 }

const        makeIntrinsicsCollector=  ()=>  {
  /** @type {Record<any, any>} */
  const intrinsics=  create(null);
  let pseudoNatives;

  const addIntrinsics=  (newIntrinsics)=>{
    initProperties(intrinsics, getOwnPropertyDescriptors(newIntrinsics));
   };
  freeze(addIntrinsics);

  // For each intrinsic, if it has a `.prototype` property, use the
  // whitelist to find out the intrinsic name for that prototype and add it
  // to the intrinsics.
  const completePrototypes=  ()=>  {
    for( const [name, intrinsic]of  entries(intrinsics)) {
      if( !isObject(intrinsic)) {
        // eslint-disable-next-line no-continue
        continue;
       }
      if( !objectHasOwnProperty(intrinsic, 'prototype')) {
        // eslint-disable-next-line no-continue
        continue;
       }
      const permit=  permitted[name];
      if( typeof permit!==  'object') {
        throw TypeError( `Expected permit object at whitelist.${name}`);
       }
      const namePrototype=  permit.prototype;
      if( !namePrototype) {
        throw TypeError( `${name}.prototype property not whitelisted`);
       }
      if(
        typeof namePrototype!==  'string'||
        !objectHasOwnProperty(permitted, namePrototype))
        {
        throw TypeError( `Unrecognized ${name}.prototype whitelist entry`);
       }
      const intrinsicPrototype=  intrinsic.prototype;
      if( objectHasOwnProperty(intrinsics, namePrototype)) {
        if( intrinsics[namePrototype]!==  intrinsicPrototype) {
          throw TypeError( `Conflicting bindings of ${namePrototype}`);
         }
        // eslint-disable-next-line no-continue
        continue;
       }
      intrinsics[namePrototype]=  intrinsicPrototype;
     }
   };
  freeze(completePrototypes);

  const finalIntrinsics=  ()=>  {
    freeze(intrinsics);
    pseudoNatives=  new WeakSet(arrayFilter(values(intrinsics), isFunction));
    return intrinsics;
   };
  freeze(finalIntrinsics);

  const isPseudoNative=  (obj)=>{
    if( !pseudoNatives) {
      throw TypeError(
        'isPseudoNative can only be called after finalIntrinsics');

     }
    return weaksetHas(pseudoNatives, obj);
   };
  freeze(isPseudoNative);

  const intrinsicsCollector=  {
    addIntrinsics,
    completePrototypes,
    finalIntrinsics,
    isPseudoNative};

  freeze(intrinsicsCollector);

  addIntrinsics(constantProperties);
  addIntrinsics(sampleGlobals(globalThis, universalPropertyNames));

  return intrinsicsCollector;
 };

/**
 * getGlobalIntrinsics()
 * Doesn't tame, delete, or modify anything. Samples globalObject to create an
 * intrinsics record containing only the whitelisted global variables, listed
 * by the intrinsic names appropriate for new globals, i.e., the globals of
 * newly constructed compartments.
 *
 * WARNING:
 * If run before lockdown, the returned intrinsics record will carry the
 * *original* unsafe (feral, untamed) bindings of these global variables.
 *
 * @param {object} globalObject
 */$h‍_once.makeIntrinsicsCollector(makeIntrinsicsCollector);
const        getGlobalIntrinsics=  (globalObject)=>{
  const { addIntrinsics, finalIntrinsics}=   makeIntrinsicsCollector();

  addIntrinsics(sampleGlobals(globalObject, sharedGlobalPropertyNames));

  return finalIntrinsics();
 };$h‍_once.getGlobalIntrinsics(getGlobalIntrinsics);
})()
,
// === functors[13] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let permitted,FunctionInstance,isAccessorPermit,Map,String,Symbol,TypeError,arrayFilter,arrayIncludes,arrayMap,entries,getOwnPropertyDescriptor,getPrototypeOf,isObject,mapGet,objectHasOwnProperty,ownKeys,symbolKeyFor;$h‍_imports([["./permits.js", [["permitted", [$h‍_a => (permitted = $h‍_a)]],["FunctionInstance", [$h‍_a => (FunctionInstance = $h‍_a)]],["isAccessorPermit", [$h‍_a => (isAccessorPermit = $h‍_a)]]]],["./commons.js", [["Map", [$h‍_a => (Map = $h‍_a)]],["String", [$h‍_a => (String = $h‍_a)]],["Symbol", [$h‍_a => (Symbol = $h‍_a)]],["TypeError", [$h‍_a => (TypeError = $h‍_a)]],["arrayFilter", [$h‍_a => (arrayFilter = $h‍_a)]],["arrayIncludes", [$h‍_a => (arrayIncludes = $h‍_a)]],["arrayMap", [$h‍_a => (arrayMap = $h‍_a)]],["entries", [$h‍_a => (entries = $h‍_a)]],["getOwnPropertyDescriptor", [$h‍_a => (getOwnPropertyDescriptor = $h‍_a)]],["getPrototypeOf", [$h‍_a => (getPrototypeOf = $h‍_a)]],["isObject", [$h‍_a => (isObject = $h‍_a)]],["mapGet", [$h‍_a => (mapGet = $h‍_a)]],["objectHasOwnProperty", [$h‍_a => (objectHasOwnProperty = $h‍_a)]],["ownKeys", [$h‍_a => (ownKeys = $h‍_a)]],["symbolKeyFor", [$h‍_a => (symbolKeyFor = $h‍_a)]]]]]);   































































/**
 * whitelistIntrinsics()
 * Removes all non-allowed properties found by recursively and
 * reflectively walking own property chains.
 *
 * @param {object} intrinsics
 * @param {(object) => void} markVirtualizedNativeFunction
 */
function                whitelistIntrinsics(
  intrinsics,
  markVirtualizedNativeFunction)
  {
  let groupStarted=  false;
  const inConsoleGroup=  (level, ...args)=>  {
    if( !groupStarted) {
      // eslint-disable-next-line @endo/no-polymorphic-call
      console.groupCollapsed('Removing unpermitted intrinsics');
      groupStarted=  true;
     }
    // eslint-disable-next-line @endo/no-polymorphic-call
    return console[level](...args);
   };

  // These primitives are allowed for permits.
  const primitives=  ['undefined', 'boolean', 'number', 'string', 'symbol'];

  // These symbols are allowed as well-known symbols
  const wellKnownSymbolNames=  new Map(
    Symbol?
        arrayMap(
          arrayFilter(
            entries(permitted['%SharedSymbol%']),
            ([name, permit])=>
              permit===  'symbol'&&  typeof Symbol[name]===  'symbol'),

          ([name])=>  [Symbol[name],  `@@${name}`]):

        []);


  /**
   * asStringPropertyName()
   *
   * @param {string} path
   * @param {string | symbol} prop
   */
  function asStringPropertyName(path, prop) {
    if( typeof prop===  'string') {
      return prop;
     }

    const wellKnownSymbol=  mapGet(wellKnownSymbolNames, prop);

    if( typeof prop===  'symbol') {
      if( wellKnownSymbol) {
        return wellKnownSymbol;
       }else {
        const registeredKey=  symbolKeyFor(prop);
        if( registeredKey!==  undefined) {
          return  `RegisteredSymbol(${registeredKey})`;
         }else {
          return  `Unique${String(prop)}`;
         }
       }
     }

    throw TypeError( `Unexpected property name type ${path} ${prop}`);
   }

  /*
   * visitPrototype()
   * Validate the object's [[prototype]] against a permit.
   */
  function visitPrototype(path, obj, protoName) {
    if( !isObject(obj)) {
      throw TypeError( `Object expected: ${path}, ${obj}, ${protoName}`);
     }
    const proto=  getPrototypeOf(obj);

    // Null prototype.
    if( proto===  null&&  protoName===  null) {
      return;
     }

    // Assert: protoName, if provided, is a string.
    if( protoName!==  undefined&&  typeof protoName!==  'string') {
      throw TypeError( `Malformed whitelist permit ${path}.__proto__`);
     }

    // If permit not specified, default to Object.prototype.
    if( proto===  intrinsics[protoName||  '%ObjectPrototype%']) {
      return;
     }

    // We can't clean [[prototype]], therefore abort.
    throw TypeError( `Unexpected intrinsic ${path}.__proto__ at ${protoName}`);
   }

  /*
   * isAllowedPropertyValue()
   * Whitelist a single property value against a permit.
   */
  function isAllowedPropertyValue(path, value, prop, permit) {
    if( typeof permit===  'object') {
      // eslint-disable-next-line no-use-before-define
      visitProperties(path, value, permit);
      // The property is allowed.
      return true;
     }

    if( permit===  false) {
      // A boolan 'false' permit specifies the removal of a property.
      // We require a more specific permit instead of allowing 'true'.
      return false;
     }

    if( typeof permit===  'string') {
      // A string permit can have one of two meanings:

      if( prop===  'prototype'||  prop===  'constructor') {
        // For prototype and constructor value properties, the permit
        // is the name of an intrinsic.
        // Assumption: prototype and constructor cannot be primitives.
        // Assert: the permit is the name of an intrinsic.
        // Assert: the property value is equal to that intrinsic.

        if( objectHasOwnProperty(intrinsics, permit)) {
          if( value!==  intrinsics[permit]) {
            throw TypeError( `Does not match whitelist ${path}`);
           }
          return true;
         }
       }else {
        // For all other properties, the permit is the name of a primitive.
        // Assert: the permit is the name of a primitive.
        // Assert: the property value type is equal to that primitive.

        // eslint-disable-next-line no-lonely-if
        if( arrayIncludes(primitives, permit)) {
          // eslint-disable-next-line valid-typeof
          if( typeof value!==  permit) {
            throw TypeError(
               `At ${path} expected ${permit} not ${typeof value}`);

           }
          return true;
         }
       }
     }

    throw TypeError( `Unexpected whitelist permit ${permit} at ${path}`);
   }

  /*
   * isAllowedProperty()
   * Check whether a single property is allowed.
   */
  function isAllowedProperty(path, obj, prop, permit) {
    const desc=  getOwnPropertyDescriptor(obj, prop);
    if( !desc) {
      throw TypeError( `Property ${prop} not found at ${path}`);
     }

    // Is this a value property?
    if( objectHasOwnProperty(desc, 'value')) {
      if( isAccessorPermit(permit)) {
        throw TypeError( `Accessor expected at ${path}`);
       }
      return isAllowedPropertyValue(path, desc.value, prop, permit);
     }
    if( !isAccessorPermit(permit)) {
      throw TypeError( `Accessor not expected at ${path}`);
     }
    return(
      isAllowedPropertyValue( `${path}<get>`,desc.get, prop, permit.get)&&
      isAllowedPropertyValue( `${path}<set>`,desc.set, prop, permit.set));

   }

  /*
   * getSubPermit()
   */
  function getSubPermit(obj, permit, prop) {
    const permitProp=  prop===  '__proto__'?  '--proto--':  prop;
    if( objectHasOwnProperty(permit, permitProp)) {
      return permit[permitProp];
     }

    if( typeof obj===  'function') {
      if( objectHasOwnProperty(FunctionInstance, permitProp)) {
        return FunctionInstance[permitProp];
       }
     }

    return undefined;
   }

  /*
   * visitProperties()
   * Visit all properties for a permit.
   */
  function visitProperties(path, obj, permit) {
    if( obj===  undefined||  obj===  null) {
      return;
     }

    const protoName=  permit['[[Proto]]'];
    visitPrototype(path, obj, protoName);

    if( typeof obj===  'function') {
      markVirtualizedNativeFunction(obj);
     }

    for( const prop of ownKeys(obj)) {
      const propString=  asStringPropertyName(path, prop);
      const subPath=   `${path}.${propString}`;
      const subPermit=  getSubPermit(obj, permit, propString);

      if( !subPermit||  !isAllowedProperty(subPath, obj, prop, subPermit)) {
        // Either the object lacks a permit or the object doesn't match the
        // permit.
        // If the permit is specifically false, not merely undefined,
        // this is a property we expect to see because we know it exists in
        // some environments and we have expressly decided to exclude it.
        // Any other disallowed property is one we have not audited and we log
        // that we are removing it so we know to look into it, as happens when
        // the language evolves new features to existing intrinsics.
        if( subPermit!==  false) {
          inConsoleGroup('warn',  `Removing ${subPath}`);
         }
        try {
          delete obj[prop];
         }catch( err) {
          if( prop in obj) {
            if( typeof obj===  'function'&&  prop===  'prototype') {
              obj.prototype=  undefined;
              if( obj.prototype===  undefined) {
                inConsoleGroup(
                  'warn',
                   `Tolerating undeletable ${subPath} === undefined`);

                // eslint-disable-next-line no-continue
                continue;
               }
             }
            inConsoleGroup('error',  `failed to delete ${subPath}`,err);
           }else {
            inConsoleGroup('error',  `deleting ${subPath} threw`,err);
           }
          throw err;
         }
       }
     }
   }

  try {
    // Start path with 'intrinsics' to clarify that properties are not
    // removed from the global object by the whitelisting operation.
    visitProperties('intrinsics', intrinsics, permitted);
   }finally {
    if( groupStarted) {
      // eslint-disable-next-line @endo/no-polymorphic-call
      console.groupEnd();
     }
   }
 }$h‍_once.default(     whitelistIntrinsics);
})()
,
// === functors[14] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let FERAL_FUNCTION,SyntaxError,TypeError,defineProperties,getPrototypeOf,setPrototypeOf,freeze;$h‍_imports([["./commons.js", [["FERAL_FUNCTION", [$h‍_a => (FERAL_FUNCTION = $h‍_a)]],["SyntaxError", [$h‍_a => (SyntaxError = $h‍_a)]],["TypeError", [$h‍_a => (TypeError = $h‍_a)]],["defineProperties", [$h‍_a => (defineProperties = $h‍_a)]],["getPrototypeOf", [$h‍_a => (getPrototypeOf = $h‍_a)]],["setPrototypeOf", [$h‍_a => (setPrototypeOf = $h‍_a)]],["freeze", [$h‍_a => (freeze = $h‍_a)]]]]]);   









// This module replaces the original `Function` constructor, and the original
// `%GeneratorFunction%`, `%AsyncFunction%` and `%AsyncGeneratorFunction%`,
// with safe replacements that throw if invoked.
//
// These are all reachable via syntax, so it isn't sufficient to just
// replace global properties with safe versions. Our main goal is to prevent
// access to the `Function` constructor through these starting points.
//
// After modules block is done, the originals must no longer be reachable,
// unless a copy has been made, and functions can only be created by syntax
// (using eval) or by invoking a previously saved reference to the originals.
//
// Typically, this module will not be used directly, but via the
// [lockdown - shim] which handles all necessary repairs and taming in SES.
//
// Relation to ECMA specifications
//
// The taming of constructors really wants to be part of the standard, because
// new constructors may be added in the future, reachable from syntax, and this
// list must be updated to match.
//
// In addition, the standard needs to define four new intrinsics for the safe
// replacement functions. See [./permits-intrinsics.js].
//
// Adapted from SES/Caja
// Copyright (C) 2011 Google Inc.
// https://github.com/google/caja/blob/master/src/com/google/caja/ses/startSES.js
// https://github.com/google/caja/blob/master/src/com/google/caja/ses/repairES5.js

/**
 * tameFunctionConstructors()
 * This block replaces the original Function constructor, and the original
 * %GeneratorFunction% %AsyncFunction% and %AsyncGeneratorFunction%, with
 * safe replacements that throw if invoked.
 */
function                tameFunctionConstructors() {
  try {
    // Verify that the method is not callable.
    // eslint-disable-next-line @endo/no-polymorphic-call
    FERAL_FUNCTION.prototype.constructor('return 1');
   }catch( ignore) {
    // Throws, no need to patch.
    return freeze({});
   }

  const newIntrinsics=  {};

  /*
   * The process to repair constructors:
   * 1. Create an instance of the function by evaluating syntax
   * 2. Obtain the prototype from the instance
   * 3. Create a substitute tamed constructor
   * 4. Replace the original constructor with the tamed constructor
   * 5. Replace tamed constructor prototype property with the original one
   * 6. Replace its [[Prototype]] slot with the tamed constructor of Function
   */
  function repairFunction(name, intrinsicName, declaration) {
    let FunctionInstance;
    try {
      // eslint-disable-next-line no-eval, no-restricted-globals
      FunctionInstance=  (0, eval)(declaration);
     }catch( e) {
      if( e instanceof SyntaxError) {
        // Prevent failure on platforms where async and/or generators
        // are not supported.
        return;
       }
      // Re-throw
      throw e;
     }
    const FunctionPrototype=  getPrototypeOf(FunctionInstance);

    // Prevents the evaluation of source when calling constructor on the
    // prototype of functions.
    // eslint-disable-next-line func-names
    const InertConstructor=  function()  {
      throw TypeError(
        'Function.prototype.constructor is not a valid constructor.');

     };
    defineProperties(InertConstructor, {
      prototype: { value: FunctionPrototype},
      name: {
        value: name,
        writable: false,
        enumerable: false,
        configurable: true}});



    defineProperties(FunctionPrototype, {
      constructor: { value: InertConstructor}});


    // Reconstructs the inheritance among the new tamed constructors
    // to mirror the original specified in normal JS.
    if( InertConstructor!==  FERAL_FUNCTION.prototype.constructor) {
      setPrototypeOf(InertConstructor, FERAL_FUNCTION.prototype.constructor);
     }

    newIntrinsics[intrinsicName]=  InertConstructor;
   }

  // Here, the order of operation is important: Function needs to be repaired
  // first since the other repaired constructors need to inherit from the
  // tamed Function function constructor.

  repairFunction('Function', '%InertFunction%', '(function(){})');
  repairFunction(
    'GeneratorFunction',
    '%InertGeneratorFunction%',
    '(function*(){})');

  repairFunction(
    'AsyncFunction',
    '%InertAsyncFunction%',
    '(async function(){})');

  repairFunction(
    'AsyncGeneratorFunction',
    '%InertAsyncGeneratorFunction%',
    '(async function*(){})');


  return newIntrinsics;
 }$h‍_once.default(     tameFunctionConstructors);
})()
,
// === functors[15] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let Date,TypeError,apply,construct,defineProperties;$h‍_imports([["./commons.js", [["Date", [$h‍_a => (Date = $h‍_a)]],["TypeError", [$h‍_a => (TypeError = $h‍_a)]],["apply", [$h‍_a => (apply = $h‍_a)]],["construct", [$h‍_a => (construct = $h‍_a)]],["defineProperties", [$h‍_a => (defineProperties = $h‍_a)]]]]]);   









function                tameDateConstructor(dateTaming=  'safe') {
  if( dateTaming!==  'safe'&&  dateTaming!==  'unsafe') {
    throw TypeError( `unrecognized dateTaming ${dateTaming}`);
   }
  const OriginalDate=  Date;
  const DatePrototype=  OriginalDate.prototype;

  // Use concise methods to obtain named functions without constructors.
  const tamedMethods=  {
    /**
     * `%SharedDate%.now()` throw a `TypeError` starting with "secure mode".
     * See https://github.com/endojs/endo/issues/910#issuecomment-1581855420
     */
    now() {
      throw TypeError('secure mode Calling %SharedDate%.now() throws');
     }};


  /**
   * Tame the Date constructor.
   * See https://github.com/endojs/endo/issues/910#issuecomment-1581855420
   *
   * Common behavior
   *   * `new Date(x)` coerces x into a number and then returns a Date
   *     for that number of millis since the epoch
   *   * `new Date(NaN)` returns a Date object which stringifies to
   *     'Invalid Date'
   *   * `new Date(undefined)` returns a Date object which stringifies to
   *     'Invalid Date'
   *
   * OriginalDate (normal standard) behavior preserved by
   * `%InitialDate%`.
   *   * `Date(anything)` gives a string with the current time
   *   * `new Date()` returns the current time, as a Date object
   *
   * `%SharedDate%` behavior
   *   * `Date(anything)` throws a TypeError starting with "secure mode"
   *   * `new Date()` throws a TypeError starting with "secure mode"
   *
   * @param {{powers?: string}} [opts]
   */
  const makeDateConstructor=  ({ powers=  'none'}=   {})=>  {
    let ResultDate;
    if( powers===  'original') {
      // eslint-disable-next-line no-shadow
      ResultDate=  function Date(...rest) {
        if( new.target===  undefined) {
          return apply(OriginalDate, undefined, rest);
         }
        return construct(OriginalDate, rest, new.target);
       };
     }else {
      // eslint-disable-next-line no-shadow
      ResultDate=  function Date(...rest) {
        if( new.target===  undefined) {
          throw TypeError(
            'secure mode Calling %SharedDate% constructor as a function throws');

         }
        if( rest.length===  0) {
          throw TypeError(
            'secure mode Calling new %SharedDate%() with no arguments throws');

         }
        return construct(OriginalDate, rest, new.target);
       };
     }

    defineProperties(ResultDate, {
      length: { value: 7},
      prototype: {
        value: DatePrototype,
        writable: false,
        enumerable: false,
        configurable: false},

      parse: {
        value: OriginalDate.parse,
        writable: true,
        enumerable: false,
        configurable: true},

      UTC: {
        value: OriginalDate.UTC,
        writable: true,
        enumerable: false,
        configurable: true}});


    return ResultDate;
   };
  const InitialDate=  makeDateConstructor({ powers: 'original'});
  const SharedDate=  makeDateConstructor({ powers: 'none'});

  defineProperties(InitialDate, {
    now: {
      value: OriginalDate.now,
      writable: true,
      enumerable: false,
      configurable: true}});


  defineProperties(SharedDate, {
    now: {
      value: tamedMethods.now,
      writable: true,
      enumerable: false,
      configurable: true}});



  defineProperties(DatePrototype, {
    constructor: { value: SharedDate}});


  return {
    '%InitialDate%': InitialDate,
    '%SharedDate%': SharedDate};

 }$h‍_once.default(     tameDateConstructor);
})()
,
// === functors[16] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let Math,TypeError,create,getOwnPropertyDescriptors,objectPrototype;$h‍_imports([["./commons.js", [["Math", [$h‍_a => (Math = $h‍_a)]],["TypeError", [$h‍_a => (TypeError = $h‍_a)]],["create", [$h‍_a => (create = $h‍_a)]],["getOwnPropertyDescriptors", [$h‍_a => (getOwnPropertyDescriptors = $h‍_a)]],["objectPrototype", [$h‍_a => (objectPrototype = $h‍_a)]]]]]);   







function                tameMathObject(mathTaming=  'safe') {
  if( mathTaming!==  'safe'&&  mathTaming!==  'unsafe') {
    throw TypeError( `unrecognized mathTaming ${mathTaming}`);
   }
  const originalMath=  Math;
  const initialMath=  originalMath; // to follow the naming pattern

  const { random: _, ...otherDescriptors}=
    getOwnPropertyDescriptors(originalMath);

  // Use concise methods to obtain named functions without constructors.
  const tamedMethods=  {
    /**
     * `%SharedMath%.random()` throws a TypeError starting with "secure mode".
     * See https://github.com/endojs/endo/issues/910#issuecomment-1581855420
     */
    random() {
      throw TypeError('secure mode %SharedMath%.random() throws');
     }};


  const sharedMath=  create(objectPrototype, {
    ...otherDescriptors,
    random: {
      value: tamedMethods.random,
      writable: true,
      enumerable: false,
      configurable: true}});



  return {
    '%InitialMath%': initialMath,
    '%SharedMath%': sharedMath};

 }$h‍_once.default(     tameMathObject);
})()
,
// === functors[17] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let FERAL_REG_EXP,TypeError,construct,defineProperties,getOwnPropertyDescriptor,speciesSymbol;$h‍_imports([["./commons.js", [["FERAL_REG_EXP", [$h‍_a => (FERAL_REG_EXP = $h‍_a)]],["TypeError", [$h‍_a => (TypeError = $h‍_a)]],["construct", [$h‍_a => (construct = $h‍_a)]],["defineProperties", [$h‍_a => (defineProperties = $h‍_a)]],["getOwnPropertyDescriptor", [$h‍_a => (getOwnPropertyDescriptor = $h‍_a)]],["speciesSymbol", [$h‍_a => (speciesSymbol = $h‍_a)]]]]]);   








function                tameRegExpConstructor(regExpTaming=  'safe') {
  if( regExpTaming!==  'safe'&&  regExpTaming!==  'unsafe') {
    throw TypeError( `unrecognized regExpTaming ${regExpTaming}`);
   }
  const RegExpPrototype=  FERAL_REG_EXP.prototype;

  const makeRegExpConstructor=  (_=  {})=>  {
    // RegExp has non-writable static properties we need to omit.
    /**
     * @param  {Parameters<typeof FERAL_REG_EXP>} rest
     */
    const ResultRegExp=  function RegExp(...rest) {
      if( new.target===  undefined) {
        return FERAL_REG_EXP(...rest);
       }
      return construct(FERAL_REG_EXP, rest, new.target);
     };

    defineProperties(ResultRegExp, {
      length: { value: 2},
      prototype: {
        value: RegExpPrototype,
        writable: false,
        enumerable: false,
        configurable: false}});


    // Hermes does not have `Symbol.species`. We should support such platforms.
    if( speciesSymbol) {
      const speciesDesc=  getOwnPropertyDescriptor(
        FERAL_REG_EXP,
        speciesSymbol);

      if( !speciesDesc) {
        throw TypeError('no RegExp[Symbol.species] descriptor');
       }
      defineProperties(ResultRegExp, {
        [speciesSymbol]: speciesDesc});

     }
    return ResultRegExp;
   };

  const InitialRegExp=  makeRegExpConstructor();
  const SharedRegExp=  makeRegExpConstructor();

  if( regExpTaming!==  'unsafe') {
    // @ts-expect-error Deleted properties must be optional
    delete RegExpPrototype.compile;
   }
  defineProperties(RegExpPrototype, {
    constructor: { value: SharedRegExp}});


  return {
    '%InitialRegExp%': InitialRegExp,
    '%SharedRegExp%': SharedRegExp};

 }$h‍_once.default(     tameRegExpConstructor);
})()
,
// === functors[18] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let toStringTagSymbol,iteratorSymbol;$h‍_imports([["./commons.js", [["toStringTagSymbol", [$h‍_a => (toStringTagSymbol = $h‍_a)]],["iteratorSymbol", [$h‍_a => (iteratorSymbol = $h‍_a)]]]]]);   

/**
 * @file Exports {@code enablements}, a recursively defined
 * JSON record defining the optimum set of intrinsics properties
 * that need to be "repaired" before hardening is applied on
 * enviromments subject to the override mistake.
 *
 * @author JF Paradis
 * @author Mark S. Miller
 */

/**
 * <p>Because "repairing" replaces data properties with accessors, every
 * time a repaired property is accessed, the associated getter is invoked,
 * which degrades the runtime performance of all code executing in the
 * repaired enviromment, compared to the non-repaired case. In order
 * to maintain performance, we only repair the properties of objects
 * for which hardening causes a breakage of their normal intended usage.
 *
 * There are three unwanted cases:
 * <ul>
 * <li>Overriding properties on objects typically used as records,
 *     namely {@code "Object"} and {@code "Array"}. In the case of arrays,
 *     the situation is unintentional, a given program might not be aware
 *     that non-numerical properties are stored on the underlying object
 *     instance, not on the array. When an object is typically used as a
 *     map, we repair all of its prototype properties.
 * <li>Overriding properties on objects that provide defaults on their
 *     prototype and that programs typically set using an assignment, such as
 *     {@code "Error.prototype.message"} and {@code "Function.prototype.name"}
 *     (both default to "").
 * <li>Setting-up a prototype chain, where a constructor is set to extend
 *     another one. This is typically set by assignment, for example
 *     {@code "Child.prototype.constructor = Child"}, instead of invoking
 *     Object.defineProperty();
 *
 * <p>Each JSON record enumerates the disposition of the properties on
 * some corresponding intrinsic object.
 *
 * <p>For each such record, the values associated with its property
 * names can be:
 * <ul>
 * <li>true, in which case this property is simply repaired. The
 *     value associated with that property is not traversed. For
 *     example, {@code "Function.prototype.name"} leads to true,
 *     meaning that the {@code "name"} property of {@code
 *     "Function.prototype"} should be repaired (which is needed
 *     when inheriting from @code{Function} and setting the subclass's
 *     {@code "prototype.name"} property). If the property is
 *     already an accessor property, it is not repaired (because
 *     accessors are not subject to the override mistake).
 * <li>"*", in which case this property is not repaired but the
 *     value associated with that property are traversed and repaired.
 * <li>Another record, in which case this property is not repaired
 *     and that next record represents the disposition of the object
 *     which is its value. For example,{@code "FunctionPrototype"}
 *     leads to another record explaining which properties {@code
 *     Function.prototype} need to be repaired.
 */

/**
 * Minimal enablements when all the code is modern and known not to
 * step into the override mistake, except for the following pervasive
 * cases.
 */
const        minEnablements=  {
  '%ObjectPrototype%': {
    toString: true},


  '%FunctionPrototype%': {
    toString: true  // set by "rollup"
},

  '%ErrorPrototype%': {
    name: true  // set by "precond", "ava", "node-fetch"
},
  '%IteratorPrototype%': {
    toString: true,
    // https://github.com/tc39/proposal-iterator-helpers
    constructor: true,
    // https://github.com/tc39/proposal-iterator-helpers
    [toStringTagSymbol]: true}};



/**
 * Moderate enablements are usually good enough for legacy compat.
 */$h‍_once.minEnablements(minEnablements);
const        moderateEnablements=  {
  '%ObjectPrototype%': {
    toString: true,
    valueOf: true},


  '%ArrayPrototype%': {
    toString: true,
    push: true, // set by "Google Analytics"
    concat: true, // set by mobx generated code (old TS compiler?)
    [iteratorSymbol]: true  // set by mobx generated code (old TS compiler?)
},

  // Function.prototype has no 'prototype' property to enable.
  // Function instances have their own 'name' and 'length' properties
  // which are configurable and non-writable. Thus, they are already
  // non-assignable anyway.
  '%FunctionPrototype%': {
    constructor: true, // set by "regenerator-runtime"
    bind: true, // set by "underscore", "express"
    toString: true  // set by "rollup"
},

  '%ErrorPrototype%': {
    constructor: true, // set by "fast-json-patch", "node-fetch"
    message: true,
    name: true, // set by "precond", "ava", "node-fetch", "node 14"
    toString: true  // set by "bluebird"
},

  '%TypeErrorPrototype%': {
    constructor: true, // set by "readable-stream"
    message: true, // set by "tape"
    name: true  // set by "readable-stream", "node 14"
},

  '%SyntaxErrorPrototype%': {
    message: true, // to match TypeErrorPrototype.message
    name: true  // set by "node 14"
},

  '%RangeErrorPrototype%': {
    message: true, // to match TypeErrorPrototype.message
    name: true  // set by "node 14"
},

  '%URIErrorPrototype%': {
    message: true, // to match TypeErrorPrototype.message
    name: true  // set by "node 14"
},

  '%EvalErrorPrototype%': {
    message: true, // to match TypeErrorPrototype.message
    name: true  // set by "node 14"
},

  '%ReferenceErrorPrototype%': {
    message: true, // to match TypeErrorPrototype.message
    name: true  // set by "node 14"
},

  // https://github.com/endojs/endo/issues/550
  '%AggregateErrorPrototype%': {
    message: true, // to match TypeErrorPrototype.message
    name: true  // set by "node 14"?
},

  '%PromisePrototype%': {
    constructor: true  // set by "core-js"
},

  '%TypedArrayPrototype%': '*', // set by https://github.com/feross/buffer

  '%Generator%': {
    constructor: true,
    name: true,
    toString: true},


  '%IteratorPrototype%': {
    toString: true,
    // https://github.com/tc39/proposal-iterator-helpers
    constructor: true,
    // https://github.com/tc39/proposal-iterator-helpers
    [toStringTagSymbol]: true}};



/**
 * The 'severe' enablement are needed because of issues tracked at
 * https://github.com/endojs/endo/issues/576
 *
 * They are like the `moderate` enablements except for the entries below.
 */$h‍_once.moderateEnablements(moderateEnablements);
const        severeEnablements=  {
  ...moderateEnablements,

  /**
   * Rollup (as used at least by vega) and webpack
   * (as used at least by regenerator) both turn exports into assignments
   * to a big `exports` object that inherits directly from
   * `Object.prototype`. Some of the exported names we've seen include
   * `hasOwnProperty`, `constructor`, and `toString`. But the strategy used
   * by rollup and webpack potentionally turns any exported name
   * into an assignment rejected by the override mistake. That's why
   * the `severe` enablements takes the extreme step of enabling
   * everything on `Object.prototype`.
   *
   * In addition, code doing inheritance manually will often override
   * the `constructor` property on the new prototype by assignment. We've
   * seen this several times.
   *
   * The cost of enabling all these is that they create a miserable debugging
   * experience specifically on Node.
   * https://github.com/Agoric/agoric-sdk/issues/2324
   * explains how it confused the Node console.
   *
   * (TODO Reexamine the vscode situation. I think it may have improved
   * since the following paragraph was written.)
   *
   * The vscode debugger's object inspector shows the own data properties of
   * an object, which is typically what you want, but also shows both getter
   * and setter for every accessor property whether inherited or own.
   * With the `'*'` setting here, all the properties inherited from
   * `Object.prototype` are accessors, creating an unusable display as seen
   * at As explained at
   * https://github.com/endojs/endo/blob/master/packages/ses/docs/lockdown.md#overridetaming-options
   * Open the triangles at the bottom of that section.
   */
  '%ObjectPrototype%': '*',

  /**
   * The widely used Buffer defined at https://github.com/feross/buffer
   * on initialization, manually creates the equivalent of a subclass of
   * `TypedArray`, which it then initializes by assignment. These assignments
   * include enough of the `TypeArray` methods that here, the `severe`
   * enablements just enable them all.
   */
  '%TypedArrayPrototype%': '*',

  /**
   * Needed to work with Immer before https://github.com/immerjs/immer/pull/914
   * is accepted.
   */
  '%MapPrototype%': '*',

  /**
   * Needed to work with Immer before https://github.com/immerjs/immer/pull/914
   * is accepted.
   */
  '%SetPrototype%': '*'};$h‍_once.severeEnablements(severeEnablements);
})()
,
// === functors[19] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let Set,String,TypeError,arrayForEach,defineProperty,getOwnPropertyDescriptor,getOwnPropertyDescriptors,isObject,objectHasOwnProperty,ownKeys,setHas,minEnablements,moderateEnablements,severeEnablements;$h‍_imports([["./commons.js", [["Set", [$h‍_a => (Set = $h‍_a)]],["String", [$h‍_a => (String = $h‍_a)]],["TypeError", [$h‍_a => (TypeError = $h‍_a)]],["arrayForEach", [$h‍_a => (arrayForEach = $h‍_a)]],["defineProperty", [$h‍_a => (defineProperty = $h‍_a)]],["getOwnPropertyDescriptor", [$h‍_a => (getOwnPropertyDescriptor = $h‍_a)]],["getOwnPropertyDescriptors", [$h‍_a => (getOwnPropertyDescriptors = $h‍_a)]],["isObject", [$h‍_a => (isObject = $h‍_a)]],["objectHasOwnProperty", [$h‍_a => (objectHasOwnProperty = $h‍_a)]],["ownKeys", [$h‍_a => (ownKeys = $h‍_a)]],["setHas", [$h‍_a => (setHas = $h‍_a)]]]],["./enablements.js", [["minEnablements", [$h‍_a => (minEnablements = $h‍_a)]],["moderateEnablements", [$h‍_a => (moderateEnablements = $h‍_a)]],["severeEnablements", [$h‍_a => (severeEnablements = $h‍_a)]]]]]);   
























/**
 * For a special set of properties defined in the `enablement` whitelist,
 * `enablePropertyOverrides` ensures that the effect of freezing does not
 * suppress the ability to override these properties on derived objects by
 * simple assignment.
 *
 * Because of lack of sufficient foresight at the time, ES5 unfortunately
 * specified that a simple assignment to a non-existent property must fail if
 * it would override an non-writable data property of the same name in the
 * shadow of the prototype chain. In retrospect, this was a mistake, the
 * so-called "override mistake". But it is now too late and we must live with
 * the consequences.
 *
 * As a result, simply freezing an object to make it tamper proof has the
 * unfortunate side effect of breaking previously correct code that is
 * considered to have followed JS best practices, if this previous code used
 * assignment to override.
 *
 * For the enabled properties, `enablePropertyOverrides` effectively shims what
 * the assignment behavior would have been in the absence of the override
 * mistake. However, the shim produces an imperfect emulation. It shims the
 * behavior by turning these data properties into accessor properties, where
 * the accessor's getter and setter provide the desired behavior. For
 * non-reflective operations, the illusion is perfect. However, reflective
 * operations like `getOwnPropertyDescriptor` see the descriptor of an accessor
 * property rather than the descriptor of a data property. At the time of this
 * writing, this is the best we know how to do.
 *
 * To the getter of the accessor we add a property named
 * `'originalValue'` whose value is, as it says, the value that the
 * data property had before being converted to an accessor property. We add
 * this extra property to the getter for two reason:
 *
 * The harden algorithm walks the own properties reflectively, i.e., with
 * `getOwnPropertyDescriptor` semantics, rather than `[[Get]]` semantics. When
 * it sees an accessor property, it does not invoke the getter. Rather, it
 * proceeds to walk both the getter and setter as part of its transitive
 * traversal. Without this extra property, `enablePropertyOverrides` would have
 * hidden the original data property value from `harden`, which would be bad.
 * Instead, by exposing that value in an own data property on the getter,
 * `harden` finds and walks it anyway.
 *
 * We enable a form of cooperative emulation, giving reflective code an
 * opportunity to cooperate in upholding the illusion. When such cooperative
 * reflective code sees an accessor property, where the accessor's getter
 * has an `originalValue` property, it knows that the getter is
 * alleging that it is the result of the `enablePropertyOverrides` conversion
 * pattern, so it can decide to cooperatively "pretend" that it sees a data
 * property with that value.
 *
 * @param {Record<string, any>} intrinsics
 * @param {'min' | 'moderate' | 'severe'} overrideTaming
 * @param {Iterable<string | symbol>} [overrideDebug]
 */
function                enablePropertyOverrides(
  intrinsics,
  overrideTaming,
  overrideDebug=  [])
  {
  const debugProperties=  new Set(overrideDebug);
  function enable(path, obj, prop, desc) {
    if( 'value'in  desc&&  desc.configurable) {
      const { value}=   desc;

      const isDebug=  setHas(debugProperties, prop);

      // We use concise method syntax to be `this` sensitive, but still
      // omit a prototype property or [[Construct]] behavior.
      // @ts-expect-error We know there is an accessor descriptor there
      const { get: getter, set: setter}=   getOwnPropertyDescriptor(
        {
          get[ prop]() {
            return value;
           },
          set[ prop](newValue) {
            if( obj===  this) {
              throw TypeError(
                 `Cannot assign to read only property '${String(
                  prop)
                  }' of '${path}'`);

             }
            if( objectHasOwnProperty(this, prop)) {
              this[prop]=  newValue;
             }else {
              if( isDebug) {
                // eslint-disable-next-line @endo/no-polymorphic-call
                console.error(TypeError( `Override property ${prop}`));
               }
              defineProperty(this, prop, {
                value: newValue,
                writable: true,
                enumerable: true,
                configurable: true});

             }
           }},

        prop);


      defineProperty(getter, 'originalValue', {
        value,
        writable: false,
        enumerable: false,
        configurable: false});


      defineProperty(obj, prop, {
        get: getter,
        set: setter,
        enumerable: desc.enumerable,
        configurable: desc.configurable});

     }
   }

  function enableProperty(path, obj, prop) {
    const desc=  getOwnPropertyDescriptor(obj, prop);
    if( !desc) {
      return;
     }
    enable(path, obj, prop, desc);
   }

  function enableAllProperties(path, obj) {
    const descs=  getOwnPropertyDescriptors(obj);
    if( !descs) {
      return;
     }
    // TypeScript does not allow symbols to be used as indexes because it
    // cannot recokon types of symbolized properties.
    arrayForEach(ownKeys(descs), (prop)=>enable(path, obj, prop, descs[prop]));
   }

  function enableProperties(path, obj, plan) {
    for( const prop of ownKeys(plan)) {
      const desc=  getOwnPropertyDescriptor(obj, prop);
      if( !desc||  desc.get||  desc.set) {
        // No not a value property, nothing to do.
        // eslint-disable-next-line no-continue
        continue;
       }

      // In case `prop` is a symbol, we first coerce it with `String`,
      // purely for diagnostic purposes.
      const subPath=   `${path}.${String(prop)}`;
      const subPlan=  plan[prop];

      if( subPlan===  true) {
        enableProperty(subPath, obj, prop);
       }else if( subPlan===  '*') {
        enableAllProperties(subPath, desc.value);
       }else if( isObject(subPlan)) {
        enableProperties(subPath, desc.value, subPlan);
       }else {
        throw TypeError( `Unexpected override enablement plan ${subPath}`);
       }
     }
   }

  let plan;
  switch( overrideTaming){
    case 'min': {
      plan=  minEnablements;
      break;
     }
    case 'moderate': {
      plan=  moderateEnablements;
      break;
     }
    case 'severe': {
      plan=  severeEnablements;
      break;
     }
    default: {
      throw TypeError( `unrecognized overrideTaming ${overrideTaming}`);
     }}


  // Do the repair.
  enableProperties('root', intrinsics, plan);
 }$h‍_once.default(     enablePropertyOverrides);
})()
,
// === functors[20] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let Number,String,TypeError,defineProperty,getOwnPropertyNames,isObject,regexpExec,assert;$h‍_imports([["./commons.js", [["Number", [$h‍_a => (Number = $h‍_a)]],["String", [$h‍_a => (String = $h‍_a)]],["TypeError", [$h‍_a => (TypeError = $h‍_a)]],["defineProperty", [$h‍_a => (defineProperty = $h‍_a)]],["getOwnPropertyNames", [$h‍_a => (getOwnPropertyNames = $h‍_a)]],["isObject", [$h‍_a => (isObject = $h‍_a)]],["regexpExec", [$h‍_a => (regexpExec = $h‍_a)]]]],["./error/assert.js", [["assert", [$h‍_a => (assert = $h‍_a)]]]]]);   










const { Fail, quote: q}=   assert;

const localePattern=  /^(\w*[a-z])Locale([A-Z]\w*)$/;

// Use concise methods to obtain named functions without constructor
// behavior or `.prototype` property.
const tamedMethods=  {
  // See https://tc39.es/ecma262/#sec-string.prototype.localecompare
  localeCompare(arg) {
    if( this===  null||  this===  undefined) {
      throw TypeError(
        'Cannot localeCompare with null or undefined "this" value');

     }
    const s=   `${this}`;
    const that=   `${arg}`;
    if( s<  that) {
      return -1;
     }
    if( s>  that) {
      return 1;
     }
    s===  that||  Fail `expected ${q(s)} and ${q(that)} to compare`;
    return 0;
   },

  toString() {
    return  `${this}`;
   }};


const nonLocaleCompare=  tamedMethods.localeCompare;
const numberToString=  tamedMethods.toString;

function                tameLocaleMethods(intrinsics, localeTaming=  'safe') {
  if( localeTaming!==  'safe'&&  localeTaming!==  'unsafe') {
    throw TypeError( `unrecognized localeTaming ${localeTaming}`);
   }
  if( localeTaming===  'unsafe') {
    return;
   }

  defineProperty(String.prototype, 'localeCompare', {
    value: nonLocaleCompare});


  for( const intrinsicName of getOwnPropertyNames(intrinsics)) {
    const intrinsic=  intrinsics[intrinsicName];
    if( isObject(intrinsic)) {
      for( const methodName of getOwnPropertyNames(intrinsic)) {
        const match=  regexpExec(localePattern, methodName);
        if( match) {
          typeof intrinsic[methodName]===  'function'||
            Fail `expected ${q(methodName)} to be a function`;
          const nonLocaleMethodName=   `${match[1]}${match[2]}`;
          const method=  intrinsic[nonLocaleMethodName];
          typeof method===  'function'||
            Fail `function ${q(nonLocaleMethodName)} not found`;
          defineProperty(intrinsic, methodName, { value: method});
         }
       }
     }
   }

  // Numbers are special because toString accepts a radix instead of ignoring
  // all of the arguments that we would otherwise forward.
  defineProperty(Number.prototype, 'toLocaleString', {
    value: numberToString});

 }$h‍_once.default(     tameLocaleMethods);
})()
,
// === functors[21] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   $h‍_imports([]);   /**
 * makeEvalFunction()
 * A safe version of the native eval function which relies on
 * the safety of safeEvaluate for confinement.
 *
 * @param {Function} safeEvaluate
 */
const        makeEvalFunction=  (safeEvaluate)=>{
  // We use the concise method syntax to create an eval without a
  // [[Construct]] behavior (such that the invocation "new eval()" throws
  // TypeError: eval is not a constructor"), but which still accepts a
  // 'this' binding.
  const newEval=  {
    eval(source) {
      if( typeof source!==  'string') {
        // As per the runtime semantic of PerformEval [ECMAScript 18.2.1.1]:
        // If Type(source) is not String, return source.
        // TODO Recent proposals from Mike Samuel may change this non-string
        // rule. Track.
        return source;
       }
      return safeEvaluate(source);
     }}.
    eval;

  return newEval;
 };$h‍_once.makeEvalFunction(makeEvalFunction);
})()
,
// === functors[22] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let FERAL_FUNCTION,arrayJoin,arrayPop,defineProperties,getPrototypeOf,assert;$h‍_imports([["./commons.js", [["FERAL_FUNCTION", [$h‍_a => (FERAL_FUNCTION = $h‍_a)]],["arrayJoin", [$h‍_a => (arrayJoin = $h‍_a)]],["arrayPop", [$h‍_a => (arrayPop = $h‍_a)]],["defineProperties", [$h‍_a => (defineProperties = $h‍_a)]],["getPrototypeOf", [$h‍_a => (getPrototypeOf = $h‍_a)]]]],["./error/assert.js", [["assert", [$h‍_a => (assert = $h‍_a)]]]]]);   








const { Fail}=   assert;

/*
 * makeFunctionConstructor()
 * A safe version of the native Function which relies on
 * the safety of safeEvaluate for confinement.
 */
const        makeFunctionConstructor=  (safeEvaluate)=>{
  // Define an unused parameter to ensure Function.length === 1
  const newFunction=  function Function(_body) {
    // Sanitize all parameters at the entry point.
    // eslint-disable-next-line prefer-rest-params
    const bodyText=   `${arrayPop(arguments)|| '' }`;
    // eslint-disable-next-line prefer-rest-params
    const parameters=   `${arrayJoin(arguments,',') }`;

    // Are parameters and bodyText valid code, or is someone
    // attempting an injection attack? This will throw a SyntaxError if:
    // - parameters doesn't parse as parameters
    // - bodyText doesn't parse as a function body
    // - either contain a call to super() or references a super property.
    //
    // It seems that XS may still be vulnerable to the attack explained at
    // https://github.com/tc39/ecma262/pull/2374#issuecomment-813769710
    // where `new Function('/*', '*/ ) {')` would incorrectly validate.
    // Before we worried about this, we check the parameters and bodyText
    // together in one call
    // ```js
    // new FERAL_FUNCTION(parameters, bodyTest);
    // ```
    // However, this check is vulnerable to that bug. Aside from that case,
    // all engines do seem to validate the parameters, taken by themselves,
    // correctly. And all engines do seem to validate the bodyText, taken
    // by itself correctly. So with the following two checks, SES builds a
    // correct safe `Function` constructor by composing two calls to an
    // original unsafe `Function` constructor that may suffer from this bug
    // but is otherwise correctly validating.
    //
    // eslint-disable-next-line no-new
    new FERAL_FUNCTION(parameters, '');
    // eslint-disable-next-line no-new
    new FERAL_FUNCTION(bodyText);

    // Safe to be combined. Defeat potential trailing comments.
    // TODO: since we create an anonymous function, the 'this' value
    // isn't bound to the global object as per specs, but set as undefined.
    const src=   `(function anonymous(${parameters}\n) {\n${bodyText}\n})`;
    return safeEvaluate(src);
   };

  defineProperties(newFunction, {
    // Ensure that any function created in any evaluator in a realm is an
    // instance of Function in any evaluator of the same realm.
    prototype: {
      value: FERAL_FUNCTION.prototype,
      writable: false,
      enumerable: false,
      configurable: false}});



  // Assert identity of Function.__proto__ accross all compartments
  getPrototypeOf(FERAL_FUNCTION)===  FERAL_FUNCTION.prototype||
    Fail `Function prototype is the same accross compartments`;
  getPrototypeOf(newFunction)===  FERAL_FUNCTION.prototype||
    Fail `Function constructor prototype is the same accross compartments`;

  return newFunction;
 };$h‍_once.makeFunctionConstructor(makeFunctionConstructor);
})()
,
// === functors[23] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let TypeError,assign,create,defineProperty,entries,freeze,objectHasOwnProperty,unscopablesSymbol,makeEvalFunction,makeFunctionConstructor,constantProperties,universalPropertyNames;$h‍_imports([["./commons.js", [["TypeError", [$h‍_a => (TypeError = $h‍_a)]],["assign", [$h‍_a => (assign = $h‍_a)]],["create", [$h‍_a => (create = $h‍_a)]],["defineProperty", [$h‍_a => (defineProperty = $h‍_a)]],["entries", [$h‍_a => (entries = $h‍_a)]],["freeze", [$h‍_a => (freeze = $h‍_a)]],["objectHasOwnProperty", [$h‍_a => (objectHasOwnProperty = $h‍_a)]],["unscopablesSymbol", [$h‍_a => (unscopablesSymbol = $h‍_a)]]]],["./make-eval-function.js", [["makeEvalFunction", [$h‍_a => (makeEvalFunction = $h‍_a)]]]],["./make-function-constructor.js", [["makeFunctionConstructor", [$h‍_a => (makeFunctionConstructor = $h‍_a)]]]],["./permits.js", [["constantProperties", [$h‍_a => (constantProperties = $h‍_a)]],["universalPropertyNames", [$h‍_a => (universalPropertyNames = $h‍_a)]]]]]);   













/**
 * The host's ordinary global object is not provided by a `with` block, so
 * assigning to Symbol.unscopables has no effect.
 * Since this shim uses `with` blocks to create a confined lexical scope for
 * guest programs, we cannot emulate the proper behavior.
 * With this shim, assigning Symbol.unscopables causes the given lexical
 * names to fall through to the terminal scope proxy.
 * But, we can install this setter to prevent a program from proceding on
 * this false assumption.
 *
 * @param {object} globalObject
 */
const        setGlobalObjectSymbolUnscopables=  (globalObject)=>{
  defineProperty(
    globalObject,
    unscopablesSymbol,
    freeze(
      assign(create(null), {
        set: freeze(()=>  {
          throw TypeError(
             `Cannot set Symbol.unscopables of a Compartment's globalThis`);

         }),
        enumerable: false,
        configurable: false})));



 };

/**
 * setGlobalObjectConstantProperties()
 * Initializes a new global object using a process similar to ECMA specifications
 * (SetDefaultGlobalBindings). This process is split between this function and
 * `setGlobalObjectMutableProperties`.
 *
 * @param {object} globalObject
 */$h‍_once.setGlobalObjectSymbolUnscopables(setGlobalObjectSymbolUnscopables);
const        setGlobalObjectConstantProperties=  (globalObject)=>{
  for( const [name, constant]of  entries(constantProperties)) {
    defineProperty(globalObject, name, {
      value: constant,
      writable: false,
      enumerable: false,
      configurable: false});

   }
 };

/**
 * setGlobalObjectMutableProperties()
 * Create new global object using a process similar to ECMA specifications
 * (portions of SetRealmGlobalObject and SetDefaultGlobalBindings).
 * `newGlobalPropertyNames` should be either `initialGlobalPropertyNames` or
 * `sharedGlobalPropertyNames`.
 *
 * @param {object} globalObject
 * @param {object} param1
 * @param {object} param1.intrinsics
 * @param {object} param1.newGlobalPropertyNames
 * @param {Function} param1.makeCompartmentConstructor
 * @param {(object) => void} param1.markVirtualizedNativeFunction
 */$h‍_once.setGlobalObjectConstantProperties(setGlobalObjectConstantProperties);
const        setGlobalObjectMutableProperties=  (
  globalObject,
  {
    intrinsics,
    newGlobalPropertyNames,
    makeCompartmentConstructor,
    markVirtualizedNativeFunction})=>

     {
  for( const [name, intrinsicName]of  entries(universalPropertyNames)) {
    if( objectHasOwnProperty(intrinsics, intrinsicName)) {
      defineProperty(globalObject, name, {
        value: intrinsics[intrinsicName],
        writable: true,
        enumerable: false,
        configurable: true});

     }
   }

  for( const [name, intrinsicName]of  entries(newGlobalPropertyNames)) {
    if( objectHasOwnProperty(intrinsics, intrinsicName)) {
      defineProperty(globalObject, name, {
        value: intrinsics[intrinsicName],
        writable: true,
        enumerable: false,
        configurable: true});

     }
   }

  const perCompartmentGlobals=  {
    globalThis: globalObject};


  perCompartmentGlobals.Compartment=  freeze(
    makeCompartmentConstructor(
      makeCompartmentConstructor,
      intrinsics,
      markVirtualizedNativeFunction));



  // TODO These should still be tamed according to the whitelist before
  // being made available.
  for( const [name, value]of  entries(perCompartmentGlobals)) {
    defineProperty(globalObject, name, {
      value,
      writable: true,
      enumerable: false,
      configurable: true});

    if( typeof value===  'function') {
      markVirtualizedNativeFunction(value);
     }
   }
 };

/**
 * setGlobalObjectEvaluators()
 * Set the eval and the Function evaluator on the global object with given evalTaming policy.
 *
 * @param {object} globalObject
 * @param {Function} evaluator
 * @param {(object) => void} markVirtualizedNativeFunction
 */$h‍_once.setGlobalObjectMutableProperties(setGlobalObjectMutableProperties);
const        setGlobalObjectEvaluators=  (
  globalObject,
  evaluator,
  markVirtualizedNativeFunction)=>
     {
  {
    const f=  freeze(makeEvalFunction(evaluator));
    markVirtualizedNativeFunction(f);
    defineProperty(globalObject, 'eval', {
      value: f,
      writable: true,
      enumerable: false,
      configurable: true});

   }
  {
    const f=  freeze(makeFunctionConstructor(evaluator));
    markVirtualizedNativeFunction(f);
    defineProperty(globalObject, 'Function', {
      value: f,
      writable: true,
      enumerable: false,
      configurable: true});

   }
 };$h‍_once.setGlobalObjectEvaluators(setGlobalObjectEvaluators);
})()
,
// === functors[24] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let Proxy,String,TypeError,ReferenceError,create,freeze,getOwnPropertyDescriptors,globalThis,immutableObject,assert;$h‍_imports([["./commons.js", [["Proxy", [$h‍_a => (Proxy = $h‍_a)]],["String", [$h‍_a => (String = $h‍_a)]],["TypeError", [$h‍_a => (TypeError = $h‍_a)]],["ReferenceError", [$h‍_a => (ReferenceError = $h‍_a)]],["create", [$h‍_a => (create = $h‍_a)]],["freeze", [$h‍_a => (freeze = $h‍_a)]],["getOwnPropertyDescriptors", [$h‍_a => (getOwnPropertyDescriptors = $h‍_a)]],["globalThis", [$h‍_a => (globalThis = $h‍_a)]],["immutableObject", [$h‍_a => (immutableObject = $h‍_a)]]]],["./error/assert.js", [["assert", [$h‍_a => (assert = $h‍_a)]]]]]);   












const { Fail, quote: q}=   assert;

/**
 * alwaysThrowHandler
 * This is an object that throws if any property is called. It's used as
 * a proxy handler which throws on any trap called.
 * It's made from a proxy with a get trap that throws. It's safe to
 * create one and share it between all Proxy handlers.
 */
const        alwaysThrowHandler=  new Proxy(
  immutableObject,
  freeze({
    get(_shadow, prop) {
      Fail `Please report unexpected scope handler trap: ${q(String(prop))}`;
     }}));



/*
 * scopeProxyHandlerProperties
 * scopeTerminatorHandler manages a strictScopeTerminator Proxy which serves as
 * the final scope boundary that will always return "undefined" in order
 * to prevent access to "start compartment globals".
 */$h‍_once.alwaysThrowHandler(alwaysThrowHandler);
const scopeProxyHandlerProperties=  {
  get(_shadow, _prop) {
    return undefined;
   },

  set(_shadow, prop, _value) {
    // We should only hit this if the has() hook returned true matches the v8
    // ReferenceError message "Uncaught ReferenceError: xyz is not defined"
    throw ReferenceError( `${String(prop)} is not defined`);
   },

  has(_shadow, prop) {
    // we must at least return true for all properties on the realm globalThis
    return prop in globalThis;
   },

  // note: this is likely a bug of safari
  // https://bugs.webkit.org/show_bug.cgi?id=195534
  getPrototypeOf(_shadow) {
    return null;
   },

  // See https://github.com/endojs/endo/issues/1510
  // TODO: report as bug to v8 or Chrome, and record issue link here.
  getOwnPropertyDescriptor(_shadow, prop) {
    // Coerce with `String` in case prop is a symbol.
    const quotedProp=  q(String(prop));
    // eslint-disable-next-line @endo/no-polymorphic-call
    console.warn(
       `getOwnPropertyDescriptor trap on scopeTerminatorHandler for ${quotedProp}`,
      TypeError().stack);

    return undefined;
   },

  // See https://github.com/endojs/endo/issues/1490
  // TODO Report bug to JSC or Safari
  ownKeys(_shadow) {
    return [];
   }};


// The scope handler's prototype is a proxy that throws if any trap other
// than get/set/has are run (like getOwnPropertyDescriptors, apply,
// getPrototypeOf).
const        strictScopeTerminatorHandler=  freeze(
  create(
    alwaysThrowHandler,
    getOwnPropertyDescriptors(scopeProxyHandlerProperties)));$h‍_once.strictScopeTerminatorHandler(strictScopeTerminatorHandler);



const        strictScopeTerminator=  new Proxy(
  immutableObject,
  strictScopeTerminatorHandler);$h‍_once.strictScopeTerminator(strictScopeTerminator);
})()
,
// === functors[25] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let Proxy,create,freeze,getOwnPropertyDescriptors,immutableObject,reflectSet,strictScopeTerminatorHandler,alwaysThrowHandler;$h‍_imports([["./commons.js", [["Proxy", [$h‍_a => (Proxy = $h‍_a)]],["create", [$h‍_a => (create = $h‍_a)]],["freeze", [$h‍_a => (freeze = $h‍_a)]],["getOwnPropertyDescriptors", [$h‍_a => (getOwnPropertyDescriptors = $h‍_a)]],["immutableObject", [$h‍_a => (immutableObject = $h‍_a)]],["reflectSet", [$h‍_a => (reflectSet = $h‍_a)]]]],["./strict-scope-terminator.js", [["strictScopeTerminatorHandler", [$h‍_a => (strictScopeTerminatorHandler = $h‍_a)]],["alwaysThrowHandler", [$h‍_a => (alwaysThrowHandler = $h‍_a)]]]]]);   












/*
 * createSloppyGlobalsScopeTerminator()
 * strictScopeTerminatorHandler manages a scopeTerminator Proxy which serves as
 * the final scope boundary that will always return "undefined" in order
 * to prevent access to "start compartment globals". When "sloppyGlobalsMode"
 * is true, the Proxy will perform sets on the "globalObject".
 */
const        createSloppyGlobalsScopeTerminator=  (globalObject)=>{
  const scopeProxyHandlerProperties=  {
    // inherit scopeTerminator behavior
    ...strictScopeTerminatorHandler,

    // Redirect set properties to the globalObject.
    set(_shadow, prop, value) {
      return reflectSet(globalObject, prop, value);
     },

    // Always claim to have a potential property in order to be the recipient of a set
    has(_shadow, _prop) {
      return true;
     }};


  // The scope handler's prototype is a proxy that throws if any trap other
  // than get/set/has are run (like getOwnPropertyDescriptors, apply,
  // getPrototypeOf).
  const sloppyGlobalsScopeTerminatorHandler=  freeze(
    create(
      alwaysThrowHandler,
      getOwnPropertyDescriptors(scopeProxyHandlerProperties)));



  const sloppyGlobalsScopeTerminator=  new Proxy(
    immutableObject,
    sloppyGlobalsScopeTerminatorHandler);


  return sloppyGlobalsScopeTerminator;
 };$h‍_once.createSloppyGlobalsScopeTerminator(createSloppyGlobalsScopeTerminator);
freeze(createSloppyGlobalsScopeTerminator);
})()
,
// === functors[26] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let FERAL_EVAL,create,defineProperties,freeze,assert;$h‍_imports([["./commons.js", [["FERAL_EVAL", [$h‍_a => (FERAL_EVAL = $h‍_a)]],["create", [$h‍_a => (create = $h‍_a)]],["defineProperties", [$h‍_a => (defineProperties = $h‍_a)]],["freeze", [$h‍_a => (freeze = $h‍_a)]]]],["./error/assert.js", [["assert", [$h‍_a => (assert = $h‍_a)]]]]]);   



const { Fail}=   assert;

// We attempt to frustrate stack bumping attacks on the safe evaluator
// (`make-safe-evaluator.js`).
// A stack bumping attack forces an API call to throw a stack overflow
// `RangeError` at an inopportune time.
// The attacker arranges for the stack to be sufficiently deep that the API
// consumes exactly enough stack frames to throw an exception.
//
// For the safe evaluator, an exception thrown between adding and then deleting
// `eval` on `evalScope` could leak the real `eval` to an attacker's lexical
// scope.
// This would be sufficiently disastrous that we guard against it twice.
// First, we delete `eval` from `evalScope` immediately before rendering it to
// the guest program's lexical scope.
//
// If the attacker manages to arrange for `eval` to throw an exception after we
// call `allowNextEvalToBeUnsafe` but before the guest program accesses `eval`,
// it would be able to access `eval` once more in its own code.
// Although they could do no harm with a direct `eval`, they would be able to
// escape to the true global scope with an indirect `eval`.
//
//   prepareStack(depth, () => {
//     (eval)('');
//   });
//   const unsafeEval = (eval);
//   const safeEval = (eval);
//   const realGlobal = unsafeEval('globalThis');
//
// To protect against that case, we also delete `eval` from the `evalScope` in
// a `finally` block surrounding the call to the safe evaluator.
// The only way to reach this case is if `eval` remains on `evalScope` due to
// an attack, so we assume that attack would have have invalided our isolation
// and revoke all future access to the evaluator.
//
// To defeat a stack bumping attack, we must use fewer stack frames to recover
// in that `finally` block than we used in the `try` block.
// We have no reliable guarantees about how many stack frames a block of
// JavaScript will consume.
// Function inlining, tail-call optimization, variations in the size of a stack
// frame, and block scopes may affect the depth of the stack.
// The only number of acceptable stack frames to use in the finally block is
// zero.
// We only use property assignment and deletion in the safe evaluator's
// `finally` block.
// We use `delete evalScope.eval` to withhold the evaluator.
// We assign an envelope object over `evalScopeKit.revoked` to revoke the
// evaluator.
//
// This is why we supply a meaningfully named function for
// `allowNextEvalToBeUnsafe` but do not provide a corresponding
// `revokeAccessToUnsafeEval` or even simply `revoke`.
// These recovery routines are expressed inline in the safe evaluator.

const        makeEvalScopeKit=  ()=>  {
  const evalScope=  create(null);
  const oneTimeEvalProperties=  freeze({
    eval: {
      get() {
        delete evalScope.eval;
        return FERAL_EVAL;
       },
      enumerable: false,
      configurable: true}});



  const evalScopeKit=  {
    evalScope,
    allowNextEvalToBeUnsafe() {
      const { revoked}=   evalScopeKit;
      if( revoked!==  null) {
        Fail `a handler did not reset allowNextEvalToBeUnsafe ${revoked.err}`;
       }
      // Allow next reference to eval produce the unsafe FERAL_EVAL.
      // We avoid defineProperty because it consumes an extra stack frame taming
      // its return value.
      defineProperties(evalScope, oneTimeEvalProperties);
     },
    /** @type {null | { err: any }} */
    revoked: null};


  return evalScopeKit;
 };$h‍_once.makeEvalScopeKit(makeEvalScopeKit);
})()
,
// === functors[27] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let FERAL_REG_EXP,regexpExec,stringSlice;$h‍_imports([["./commons.js", [["FERAL_REG_EXP", [$h‍_a => (FERAL_REG_EXP = $h‍_a)]],["regexpExec", [$h‍_a => (regexpExec = $h‍_a)]],["stringSlice", [$h‍_a => (stringSlice = $h‍_a)]]]]]);   

// Captures a key and value of the form #key=value or @key=value
const sourceMetaEntryRegExp=
  '\\s*[@#]\\s*([a-zA-Z][a-zA-Z0-9]*)\\s*=\\s*([^\\s\\*]*)';
// Captures either a one-line or multi-line comment containing
// one #key=value or @key=value.
// Produces two pairs of capture groups, but the initial two may be undefined.
// On account of the mechanics of regular expressions, scanning from the end
// does not allow us to capture every pair, so getSourceURL must capture and
// trim until there are no matching comments.
const sourceMetaEntriesRegExp=  new FERAL_REG_EXP(
   `(?:\\s*//${sourceMetaEntryRegExp}|/\\*${sourceMetaEntryRegExp}\\s*\\*/)\\s*$`);


/**
 * @param {string} src
 */
const        getSourceURL=  (src)=>{
  let sourceURL=  '<unknown>';

  // Our regular expression matches the last one or two comments with key value
  // pairs at the end of the source, avoiding a scan over the entire length of
  // the string, but at the expense of being able to capture all the (key,
  // value) pair meta comments at the end of the source, which may include
  // sourceMapURL in addition to sourceURL.
  // So, we sublimate the comments out of the source until no source or no
  // comments remain.
  while( src.length>  0) {
    const match=  regexpExec(sourceMetaEntriesRegExp, src);
    if( match===  null) {
      break;
     }
    src=  stringSlice(src, 0, src.length-  match[0].length);

    // We skip $0 since it contains the entire match.
    // The match contains four capture groups,
    // two (key, value) pairs, the first of which
    // may be undefined.
    // On the off-chance someone put two sourceURL comments in their code with
    // different commenting conventions, the latter has precedence.
    if( match[3]===  'sourceURL') {
      sourceURL=  match[4];
     }else if( match[1]===  'sourceURL') {
      sourceURL=  match[2];
     }
   }

  return sourceURL;
 };$h‍_once.getSourceURL(getSourceURL);
})()
,
// === functors[28] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let FERAL_REG_EXP,SyntaxError,stringReplace,stringSearch,stringSlice,stringSplit,freeze,getSourceURL;$h‍_imports([["./commons.js", [["FERAL_REG_EXP", [$h‍_a => (FERAL_REG_EXP = $h‍_a)]],["SyntaxError", [$h‍_a => (SyntaxError = $h‍_a)]],["stringReplace", [$h‍_a => (stringReplace = $h‍_a)]],["stringSearch", [$h‍_a => (stringSearch = $h‍_a)]],["stringSlice", [$h‍_a => (stringSlice = $h‍_a)]],["stringSplit", [$h‍_a => (stringSplit = $h‍_a)]],["freeze", [$h‍_a => (freeze = $h‍_a)]]]],["./get-source-url.js", [["getSourceURL", [$h‍_a => (getSourceURL = $h‍_a)]]]]]);   












/**
 * Find the first occurence of the given pattern and return
 * the location as the approximate line number.
 *
 * @param {string} src
 * @param {RegExp} pattern
 * @returns {number}
 */
function getLineNumber(src, pattern) {
  const index=  stringSearch(src, pattern);
  if( index<  0) {
    return -1;
   }

  // The importPattern incidentally captures an initial \n in
  // an attempt to reject a . prefix, so we need to offset
  // the line number in that case.
  const adjustment=  src[index]===  '\n'?  1:  0;

  return stringSplit(stringSlice(src, 0, index), '\n').length+  adjustment;
 }

// /////////////////////////////////////////////////////////////////////////////

const htmlCommentPattern=  new FERAL_REG_EXP( `(?:${'<'}!--|--${'>'})`,'g');

/**
 * Conservatively reject the source text if it may contain text that some
 * JavaScript parsers may treat as an html-like comment. To reject without
 * parsing, `rejectHtmlComments` will also reject some other text as well.
 *
 * https://www.ecma-international.org/ecma-262/9.0/index.html#sec-html-like-comments
 * explains that JavaScript parsers may or may not recognize html
 * comment tokens "<" immediately followed by "!--" and "--"
 * immediately followed by ">" in non-module source text, and treat
 * them as a kind of line comment. Since otherwise both of these can
 * appear in normal JavaScript source code as a sequence of operators,
 * we have the terrifying possibility of the same source code parsing
 * one way on one correct JavaScript implementation, and another way
 * on another.
 *
 * This shim takes the conservative strategy of just rejecting source
 * text that contains these strings anywhere. Note that this very
 * source file is written strangely to avoid mentioning these
 * character strings explicitly.
 *
 * We do not write the regexp in a straightforward way, so that an
 * apparennt html comment does not appear in this file. Thus, we avoid
 * rejection by the overly eager rejectDangerousSources.
 *
 * @param {string} src
 * @returns {string}
 */
const        rejectHtmlComments=  (src)=>{
  const lineNumber=  getLineNumber(src, htmlCommentPattern);
  if( lineNumber<  0) {
    return src;
   }
  const name=  getSourceURL(src);
  // See https://github.com/endojs/endo/blob/master/packages/ses/error-codes/SES_HTML_COMMENT_REJECTED.md
  throw SyntaxError(
     `Possible HTML comment rejected at ${name}:${lineNumber}. (SES_HTML_COMMENT_REJECTED)`);

 };

/**
 * An optional transform to place ahead of `rejectHtmlComments` to evade *that*
 * rejection. However, it may change the meaning of the program.
 *
 * This evasion replaces each alleged html comment with the space-separated
 * JavaScript operator sequence that it may mean, assuming that it appears
 * outside of a comment or literal string, in source code where the JS
 * parser makes no special case for html comments (like module source code).
 * In that case, this evasion preserves the meaning of the program, though it
 * does change the souce column numbers on each effected line.
 *
 * If the html comment appeared in a literal (a string literal, regexp literal,
 * or a template literal), then this evasion will change the meaning of the
 * program by changing the text of that literal.
 *
 * If the html comment appeared in a JavaScript comment, then this evasion does
 * not change the meaning of the program because it only changes the contents of
 * those comments.
 *
 * @param {string} src
 * @returns {string}
 */$h‍_once.rejectHtmlComments(rejectHtmlComments);
const        evadeHtmlCommentTest=  (src)=>{
  const replaceFn=  (match)=> match[0]===  '<'?  '< ! --':  '-- >';
  return stringReplace(src, htmlCommentPattern, replaceFn);
 };

// /////////////////////////////////////////////////////////////////////////////
$h‍_once.evadeHtmlCommentTest(evadeHtmlCommentTest);
const importPattern=  new FERAL_REG_EXP(
  '(^|[^.]|\\.\\.\\.)\\bimport(\\s*(?:\\(|/[/*]))',
  'g');


/**
 * Conservatively reject the source text if it may contain a dynamic
 * import expression. To reject without parsing, `rejectImportExpressions` will
 * also reject some other text as well.
 *
 * The proposed dynamic import expression is the only syntax currently
 * proposed, that can appear in non-module JavaScript code, that
 * enables direct access to the outside world that cannot be
 * suppressed or intercepted without parsing and rewriting. Instead,
 * this shim conservatively rejects any source text that seems to
 * contain such an expression. To do this safely without parsing, we
 * must also reject some valid programs, i.e., those containing
 * apparent import expressions in literal strings or comments.
 *
 * The current conservative rule looks for the identifier "import"
 * followed by either an open paren or something that looks like the
 * beginning of a comment. We assume that we do not need to worry
 * about html comment syntax because that was already rejected by
 * rejectHtmlComments.
 *
 * this \s *must* match all kinds of syntax-defined whitespace. If e.g.
 * U+2028 (LINE SEPARATOR) or U+2029 (PARAGRAPH SEPARATOR) is treated as
 * whitespace by the parser, but not matched by /\s/, then this would admit
 * an attack like: import\u2028('power.js') . We're trying to distinguish
 * something like that from something like importnotreally('power.js') which
 * is perfectly safe.
 *
 * @param {string} src
 * @returns {string}
 */
const        rejectImportExpressions=  (src)=>{
  const lineNumber=  getLineNumber(src, importPattern);
  if( lineNumber<  0) {
    return src;
   }
  const name=  getSourceURL(src);
  // See https://github.com/endojs/endo/blob/master/packages/ses/error-codes/SES_IMPORT_REJECTED.md
  throw SyntaxError(
     `Possible import expression rejected at ${name}:${lineNumber}. (SES_IMPORT_REJECTED)`);

 };

/**
 * An optional transform to place ahead of `rejectImportExpressions` to evade
 * *that* rejection. However, it may change the meaning of the program.
 *
 * This evasion replaces each suspicious `import` identifier with `__import__`.
 * If the alleged import expression appears in a JavaScript comment, this
 * evasion will not change the meaning of the program. If it appears in a
 * literal (string literal, regexp literal, or a template literal), then this
 * evasion will change the contents of that literal. If it appears as code
 * where it would be parsed as an expression, then it might or might not change
 * the meaning of the program, depending on the binding, if any, of the lexical
 * variable `__import__`.
 *
 * @param {string} src
 * @returns {string}
 */$h‍_once.rejectImportExpressions(rejectImportExpressions);
const        evadeImportExpressionTest=  (src)=>{
  const replaceFn=  (_, p1, p2)=>   `${p1}__import__${p2}`;
  return stringReplace(src, importPattern, replaceFn);
 };

// /////////////////////////////////////////////////////////////////////////////
$h‍_once.evadeImportExpressionTest(evadeImportExpressionTest);
const someDirectEvalPattern=  new FERAL_REG_EXP(
  '(^|[^.])\\beval(\\s*\\()',
  'g');


/**
 * Heuristically reject some text that seems to contain a direct eval
 * expression, with both false positives and false negavives. To reject without
 * parsing, `rejectSomeDirectEvalExpressions` may will also reject some other
 * text as well. It may also accept source text that contains a direct eval
 * written oddly, such as `(eval)(src)`. This false negative is not a security
 * vulnerability. Rather it is a compat hazard because it will execute as
 * an indirect eval under the SES-shim but as a direct eval on platforms that
 * support SES directly (like XS).
 *
 * The shim cannot correctly emulate a direct eval as explained at
 * https://github.com/Agoric/realms-shim/issues/12
 * If we did not reject direct eval syntax, we would
 * accidentally evaluate these with an emulation of indirect eval. To
 * prevent future compatibility problems, in shifting from use of the
 * shim to genuine platform support for the proposal, we should
 * instead statically reject code that seems to contain a direct eval
 * expression.
 *
 * As with the dynamic import expression, to avoid a full parse, we do
 * this approximately with a regexp, that will also reject strings
 * that appear safely in comments or strings. Unlike dynamic import,
 * if we miss some, this only creates future compat problems, not
 * security problems. Thus, we are only trying to catch innocent
 * occurrences, not malicious one. In particular, `(eval)(...)` is
 * direct eval syntax that would not be caught by the following regexp.
 *
 * Exported for unit tests.
 *
 * @param {string} src
 * @returns {string}
 */
const        rejectSomeDirectEvalExpressions=  (src)=>{
  const lineNumber=  getLineNumber(src, someDirectEvalPattern);
  if( lineNumber<  0) {
    return src;
   }
  const name=  getSourceURL(src);
  // See https://github.com/endojs/endo/blob/master/packages/ses/error-codes/SES_EVAL_REJECTED.md
  throw SyntaxError(
     `Possible direct eval expression rejected at ${name}:${lineNumber}. (SES_EVAL_REJECTED)`);

 };

// /////////////////////////////////////////////////////////////////////////////

/**
 * A transform that bundles together the transforms that must unconditionally
 * happen last in order to ensure safe evaluation without parsing.
 *
 * @param {string} source
 * @returns {string}
 */$h‍_once.rejectSomeDirectEvalExpressions(rejectSomeDirectEvalExpressions);
const        mandatoryTransforms=  (source)=>{
  source=  rejectHtmlComments(source);
  source=  rejectImportExpressions(source);
  return source;
 };

/**
 * Starting with `source`, apply each transform to the result of the
 * previous one, returning the result of the last transformation.
 *
 * @param {string} source
 * @param {((str: string) => string)[]} transforms
 * @returns {string}
 */$h‍_once.mandatoryTransforms(mandatoryTransforms);
const        applyTransforms=  (source, transforms)=>  {
  for( const transform of transforms) {
    source=  transform(source);
   }
  return source;
 };

// export all as a frozen object
$h‍_once.applyTransforms(applyTransforms);const transforms=freeze({
  rejectHtmlComments: freeze(rejectHtmlComments),
  evadeHtmlCommentTest: freeze(evadeHtmlCommentTest),
  rejectImportExpressions: freeze(rejectImportExpressions),
  evadeImportExpressionTest: freeze(evadeImportExpressionTest),
  rejectSomeDirectEvalExpressions: freeze(rejectSomeDirectEvalExpressions),
  mandatoryTransforms: freeze(mandatoryTransforms),
  applyTransforms: freeze(applyTransforms)});$h‍_once.transforms(transforms);
})()
,
// === functors[29] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let arrayFilter,arrayIncludes,getOwnPropertyDescriptor,getOwnPropertyNames,objectHasOwnProperty,regexpTest;$h‍_imports([["./commons.js", [["arrayFilter", [$h‍_a => (arrayFilter = $h‍_a)]],["arrayIncludes", [$h‍_a => (arrayIncludes = $h‍_a)]],["getOwnPropertyDescriptor", [$h‍_a => (getOwnPropertyDescriptor = $h‍_a)]],["getOwnPropertyNames", [$h‍_a => (getOwnPropertyNames = $h‍_a)]],["objectHasOwnProperty", [$h‍_a => (objectHasOwnProperty = $h‍_a)]],["regexpTest", [$h‍_a => (regexpTest = $h‍_a)]]]]]);   








/**
 * keywords
 * In JavaScript you cannot use these reserved words as variables.
 * See 11.6.1 Identifier Names
 */
const keywords=  [
  // 11.6.2.1 Keywords
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'export',
  'extends',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'new',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',

  // Also reserved when parsing strict mode code
  'let',
  'static',

  // 11.6.2.2 Future Reserved Words
  'enum',

  // Also reserved when parsing strict mode code
  'implements',
  'package',
  'protected',
  'interface',
  'private',
  'public',

  // Reserved but not mentioned in specs
  'await',

  'null',
  'true',
  'false',

  'this',
  'arguments'];


/**
 * identifierPattern
 * Simplified validation of identifier names: may only contain alphanumeric
 * characters (or "$" or "_"), and may not start with a digit. This is safe
 * and does not reduces the compatibility of the shim. The motivation for
 * this limitation was to decrease the complexity of the implementation,
 * and to maintain a resonable level of performance.
 * Note: \w is equivalent [a-zA-Z_0-9]
 * See 11.6.1 Identifier Names
 */
const identifierPattern=  /^[a-zA-Z_$][\w$]*$/;

/**
 * isValidIdentifierName()
 * What variable names might it bring into scope? These include all
 * property names which can be variable names, including the names
 * of inherited properties. It excludes symbols and names which are
 * keywords. We drop symbols safely. Currently, this shim refuses
 * service if any of the names are keywords or keyword-like. This is
 * safe and only prevent performance optimization.
 *
 * @param {string} name
 */
const        isValidIdentifierName=  (name)=>{
  // Ensure we have a valid identifier. We use regexpTest rather than
  // /../.test() to guard against the case where RegExp has been poisoned.
  return(
    name!==  'eval'&&
    !arrayIncludes(keywords, name)&&
    regexpTest(identifierPattern, name));

 };

/*
 * isImmutableDataProperty
 */$h‍_once.isValidIdentifierName(isValidIdentifierName);

function isImmutableDataProperty(obj, name) {
  const desc=  getOwnPropertyDescriptor(obj, name);
  return(
    desc&&
    //
    // The getters will not have .writable, don't let the falsyness of
    // 'undefined' trick us: test with === false, not ! . However descriptors
    // inherit from the (potentially poisoned) global object, so we might see
    // extra properties which weren't really there. Accessor properties have
    // 'get/set/enumerable/configurable', while data properties have
    // 'value/writable/enumerable/configurable'.
    desc.configurable===  false&&
    desc.writable===  false&&
    //
    // Checks for data properties because they're the only ones we can
    // optimize (accessors are most likely non-constant). Descriptors can't
    // can't have accessors and value properties at the same time, therefore
    // this check is sufficient. Using explicit own property deal with the
    // case where Object.prototype has been poisoned.
    objectHasOwnProperty(desc, 'value'));

 }

/**
 * getScopeConstants()
 * What variable names might it bring into scope? These include all
 * property names which can be variable names, including the names
 * of inherited properties. It excludes symbols and names which are
 * keywords. We drop symbols safely. Currently, this shim refuses
 * service if any of the names are keywords or keyword-like. This is
 * safe and only prevent performance optimization.
 *
 * @param {object} globalObject
 * @param {object} moduleLexicals
 */
const        getScopeConstants=  (globalObject, moduleLexicals=  {})=>  {
  // getOwnPropertyNames() does ignore Symbols so we don't need to
  // filter them out.
  const globalObjectNames=  getOwnPropertyNames(globalObject);
  const moduleLexicalNames=  getOwnPropertyNames(moduleLexicals);

  // Collect all valid & immutable identifiers from the endowments.
  const moduleLexicalConstants=  arrayFilter(
    moduleLexicalNames,
    (name)=>
      isValidIdentifierName(name)&&
      isImmutableDataProperty(moduleLexicals, name));


  // Collect all valid & immutable identifiers from the global that
  // are also not present in the endowments (immutable or not).
  const globalObjectConstants=  arrayFilter(
    globalObjectNames,
    (name)=>
      // Can't define a constant: it would prevent a
      // lookup on the endowments.
      !arrayIncludes(moduleLexicalNames, name)&&
      isValidIdentifierName(name)&&
      isImmutableDataProperty(globalObject, name));


  return {
    globalObjectConstants,
    moduleLexicalConstants};

 };$h‍_once.getScopeConstants(getScopeConstants);
})()
,
// === functors[30] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let FERAL_FUNCTION,arrayJoin,apply,getScopeConstants;$h‍_imports([["./commons.js", [["FERAL_FUNCTION", [$h‍_a => (FERAL_FUNCTION = $h‍_a)]],["arrayJoin", [$h‍_a => (arrayJoin = $h‍_a)]],["apply", [$h‍_a => (apply = $h‍_a)]]]],["./scope-constants.js", [["getScopeConstants", [$h‍_a => (getScopeConstants = $h‍_a)]]]]]);   




/**
 * buildOptimizer()
 * Given an array of identifiers, the optimizer returns a `const` declaration
 * destructuring `this.${name}`.
 *
 * @param {Array<string>} constants
 * @param {string} name
 */
function buildOptimizer(constants, name) {
  // No need to build an optimizer when there are no constants.
  if( constants.length===  0) return '';
  // Use 'this' to avoid going through the scope proxy, which is unnecessary
  // since the optimizer only needs references to the safe global.
  // Destructure the constants from the target scope object.
  return  `const {${arrayJoin(constants,',') }} = this.${name};`;
 }

/**
 * makeEvaluate()
 * Create an 'evaluate' function with the correct optimizer inserted.
 *
 * @param {object} context
 * @param {object} context.evalScope
 * @param {object} context.moduleLexicals
 * @param {object} context.globalObject
 * @param {object} context.scopeTerminator
 */
const        makeEvaluate=  (context)=>{
  const { globalObjectConstants, moduleLexicalConstants}=   getScopeConstants(
    context.globalObject,
    context.moduleLexicals);

  const globalObjectOptimizer=  buildOptimizer(
    globalObjectConstants,
    'globalObject');

  const moduleLexicalOptimizer=  buildOptimizer(
    moduleLexicalConstants,
    'moduleLexicals');


  // Create a function in sloppy mode, so that we can use 'with'. It returns
  // a function in strict mode that evaluates the provided code using direct
  // eval, and thus in strict mode in the same scope. We must be very careful
  // to not create new names in this scope

  // 1: we use multiple nested 'with' to catch all free variable names. The
  // `this` value of the outer sloppy function holds the different scope
  // layers, from inner to outer:
  //    a) `evalScope` which must release the `FERAL_EVAL` as 'eval' once for
  //       every invocation of the inner `evaluate` function in order to
  //       trigger direct eval. The direct eval semantics is what allows the
  //       evaluated code to lookup free variable names on the other scope
  //       objects and not in global scope.
  //    b) `moduleLexicals` which provide a way to introduce free variables
  //       that are not available on the globalObject.
  //    c) `globalObject` is the global scope object of the evaluator, aka the
  //       Compartment's `globalThis`.
  //    d) `scopeTerminator` is a proxy object which prevents free variable
  //       lookups to escape to the start compartment's global object.
  // 2: `optimizer`s catch constant variable names for speed.
  // 3: The inner strict `evaluate` function should be passed two parameters:
  //    a) its arguments[0] is the source to be directly evaluated.
  //    b) its 'this' is the this binding seen by the code being
  //       directly evaluated (the globalObject).

  // Notes:
  // - The `optimizer` strings only lookup values on the `globalObject` and
  //   `moduleLexicals` objects by construct. Keywords like 'function' are
  //   reserved and cannot be used as a variable, so they are excluded from the
  //   optimizer. Furthermore to prevent shadowing 'eval', while a valid
  //   identifier, that name is also explicitly excluded.
  // - when 'eval' is looked up in the `evalScope`, the powerful unsafe eval
  //   intrinsic is returned after automatically removing it from the
  //   `evalScope`. Any further reference to 'eval' in the evaluate string will
  //   get the tamed evaluator from the `globalObject`, if any.

  // TODO https://github.com/endojs/endo/issues/816
  // The optimizer currently runs under sloppy mode, and although we doubt that
  // there is any vulnerability introduced just by running the optimizer
  // sloppy, we are much more confident in the semantics of strict mode.
  // The `evaluate` function can be and is reused across multiple evaluations.
  // Since the optimizer should not be re-evaluated every time, it cannot be
  // inside the `evaluate` closure. While we could potentially nest an
  // intermediate layer of `() => {'use strict'; ${optimizers}; ...`, it
  // doesn't seem worth the overhead and complexity.
  const evaluateFactory=  FERAL_FUNCTION( `
    with (this.scopeTerminator) {
      with (this.globalObject) {
        with (this.moduleLexicals) {
          with (this.evalScope) {
            ${globalObjectOptimizer }
            ${moduleLexicalOptimizer }
            return function() {
              'use strict';
              return eval(arguments[0]);
            };
          }
        }
      }
    }
  `);

  return apply(evaluateFactory, context, []);
 };$h‍_once.makeEvaluate(makeEvaluate);
})()
,
// === functors[31] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let apply,freeze,strictScopeTerminator,createSloppyGlobalsScopeTerminator,makeEvalScopeKit,applyTransforms,mandatoryTransforms,makeEvaluate,assert;$h‍_imports([["./commons.js", [["apply", [$h‍_a => (apply = $h‍_a)]],["freeze", [$h‍_a => (freeze = $h‍_a)]]]],["./strict-scope-terminator.js", [["strictScopeTerminator", [$h‍_a => (strictScopeTerminator = $h‍_a)]]]],["./sloppy-globals-scope-terminator.js", [["createSloppyGlobalsScopeTerminator", [$h‍_a => (createSloppyGlobalsScopeTerminator = $h‍_a)]]]],["./eval-scope.js", [["makeEvalScopeKit", [$h‍_a => (makeEvalScopeKit = $h‍_a)]]]],["./transforms.js", [["applyTransforms", [$h‍_a => (applyTransforms = $h‍_a)]],["mandatoryTransforms", [$h‍_a => (mandatoryTransforms = $h‍_a)]]]],["./make-evaluate.js", [["makeEvaluate", [$h‍_a => (makeEvaluate = $h‍_a)]]]],["./error/assert.js", [["assert", [$h‍_a => (assert = $h‍_a)]]]]]);   










const { Fail}=   assert;

/**
 * makeSafeEvaluator()
 * Build the low-level operation used by all evaluators:
 * eval(), Function(), Compartment.prototype.evaluate().
 *
 * @param {object} options
 * @param {object} options.globalObject
 * @param {object} [options.moduleLexicals]
 * @param {Array<import('./lockdown.js').Transform>} [options.globalTransforms]
 * @param {boolean} [options.sloppyGlobalsMode]
 */
const        makeSafeEvaluator=  ({
  globalObject,
  moduleLexicals=  {},
  globalTransforms=  [],
  sloppyGlobalsMode=  false})=>
      {
  const scopeTerminator=  sloppyGlobalsMode?
      createSloppyGlobalsScopeTerminator(globalObject):
      strictScopeTerminator;
  const evalScopeKit=  makeEvalScopeKit();
  const { evalScope}=   evalScopeKit;

  const evaluateContext=  freeze({
    evalScope,
    moduleLexicals,
    globalObject,
    scopeTerminator});


  // Defer creating the actual evaluator to first use.
  // Creating a compartment should be possible in no-eval environments
  // It also allows more global constants to be captured by the optimizer
  let evaluate;
  const provideEvaluate=  ()=>  {
    if( !evaluate) {
      evaluate=  makeEvaluate(evaluateContext);
     }
   };

  /**
   * @param {string} source
   * @param {object} [options]
   * @param {Array<import('./lockdown.js').Transform>} [options.localTransforms]
   */
  const safeEvaluate=  (source, options)=>  {
    const { localTransforms=  []}=   options||  {};
    provideEvaluate();

    // Execute the mandatory transforms last to ensure that any rewritten code
    // meets those mandatory requirements.
    source=  applyTransforms(source, [
      ...localTransforms,
      ...globalTransforms,
      mandatoryTransforms]);


    let err;
    try {
      // Allow next reference to eval produce the unsafe FERAL_EVAL.
      // eslint-disable-next-line @endo/no-polymorphic-call
      evalScopeKit.allowNextEvalToBeUnsafe();

      // Ensure that "this" resolves to the safe global.
      return apply(evaluate, globalObject, [source]);
     }catch( e) {
      // stash the child-code error in hopes of debugging the internal failure
      err=  e;
      throw e;
     }finally {
      const unsafeEvalWasStillExposed=( 'eval'in  evalScope);
      delete evalScope.eval;
      if( unsafeEvalWasStillExposed) {
        // Barring a defect in the SES shim, the evalScope should allow the
        // powerful, unsafe  `eval` to be used by `evaluate` exactly once, as the
        // very first name that it attempts to access from the lexical scope.
        // A defect in the SES shim could throw an exception after we set
        // `evalScope.eval` and before `evaluate` calls `eval` internally.
        // If we get here, SES is very broken.
        // This condition is one where this vat is now hopelessly confused, and
        // the vat as a whole should be aborted.
        // No further code should run.
        // All immediately reachable state should be abandoned.
        // However, that is not yet possible, so we at least prevent further
        // variable resolution via the scopeHandler, and throw an error with
        // diagnostic info including the thrown error if any from evaluating the
        // source code.
        evalScopeKit.revoked=  { err};
        // TODO A GOOD PLACE TO PANIC(), i.e., kill the vat incarnation.
        // See https://github.com/Agoric/SES-shim/issues/490
        Fail `handler did not reset allowNextEvalToBeUnsafe ${err}`;
       }
     }
   };

  return { safeEvaluate};
 };$h‍_once.makeSafeEvaluator(makeSafeEvaluator);
})()
,
// === functors[32] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let WeakSet,defineProperty,freeze,functionPrototype,functionToString,stringEndsWith,weaksetAdd,weaksetHas;$h‍_imports([["./commons.js", [["WeakSet", [$h‍_a => (WeakSet = $h‍_a)]],["defineProperty", [$h‍_a => (defineProperty = $h‍_a)]],["freeze", [$h‍_a => (freeze = $h‍_a)]],["functionPrototype", [$h‍_a => (functionPrototype = $h‍_a)]],["functionToString", [$h‍_a => (functionToString = $h‍_a)]],["stringEndsWith", [$h‍_a => (stringEndsWith = $h‍_a)]],["weaksetAdd", [$h‍_a => (weaksetAdd = $h‍_a)]],["weaksetHas", [$h‍_a => (weaksetHas = $h‍_a)]]]]]);   










const nativeSuffix=  ') { [native code] }';

// Note: Top level mutable state. Does not make anything worse, since the
// patching of `Function.prototype.toString` is also globally stateful. We
// use this top level state so that multiple calls to `tameFunctionToString` are
// idempotent, rather than creating redundant indirections.
let markVirtualizedNativeFunction;

/**
 * Replace `Function.prototype.toString` with one that recognizes
 * shimmed functions as honorary native functions.
 */
const        tameFunctionToString=  ()=>  {
  if( markVirtualizedNativeFunction===  undefined) {
    const virtualizedNativeFunctions=  new WeakSet();

    const tamingMethods=  {
      toString() {
        const str=  functionToString(this);
        if(
          stringEndsWith(str, nativeSuffix)||
          !weaksetHas(virtualizedNativeFunctions, this))
          {
          return str;
         }
        return  `function ${this.name}() { [native code] }`;
       }};


    defineProperty(functionPrototype, 'toString', {
      value: tamingMethods.toString});


    markVirtualizedNativeFunction=  freeze((func)=>
      weaksetAdd(virtualizedNativeFunctions, func));

   }
  return markVirtualizedNativeFunction;
 };$h‍_once.tameFunctionToString(tameFunctionToString);
})()
,
// === functors[33] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let TypeError,globalThis,getOwnPropertyDescriptor,defineProperty;$h‍_imports([["./commons.js", [["TypeError", [$h‍_a => (TypeError = $h‍_a)]],["globalThis", [$h‍_a => (globalThis = $h‍_a)]],["getOwnPropertyDescriptor", [$h‍_a => (getOwnPropertyDescriptor = $h‍_a)]],["defineProperty", [$h‍_a => (defineProperty = $h‍_a)]]]]]);Object.defineProperty(tameDomains, 'name', {value: "tameDomains"});$h‍_once.tameDomains(tameDomains);   








function        tameDomains(domainTaming=  'safe') {
  if( domainTaming!==  'safe'&&  domainTaming!==  'unsafe') {
    throw TypeError( `unrecognized domainTaming ${domainTaming}`);
   }

  if( domainTaming===  'unsafe') {
    return;
   }

  // Protect against the hazard presented by Node.js domains.
  const globalProcess=  globalThis.process||  undefined;
  if( typeof globalProcess===  'object') {
    // Check whether domains were initialized.
    const domainDescriptor=  getOwnPropertyDescriptor(globalProcess, 'domain');
    if( domainDescriptor!==  undefined&&  domainDescriptor.get!==  undefined) {
      // The domain descriptor on Node.js initially has value: null, which
      // becomes a get, set pair after domains initialize.
      // See https://github.com/endojs/endo/blob/master/packages/ses/error-codes/SES_NO_DOMAINS.md
      throw TypeError(
         `SES failed to lockdown, Node.js domains have been initialized (SES_NO_DOMAINS)`);

     }
    // Prevent domains from initializing.
    // This is clunky because the exception thrown from the domains package does
    // not direct the user's gaze toward a knowledge base about the problem.
    // The domain module merely throws an exception when it attempts to define
    // the domain property of the process global during its initialization.
    // We have no better recourse because Node.js uses defineProperty too.
    defineProperty(globalProcess, 'domain', {
      value: null,
      configurable: false,
      writable: false,
      enumerable: false});

   }
 }
})()
,
// === functors[34] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let WeakSet,arrayFilter,arrayFlatMap,arrayMap,arrayPop,arrayPush,defineProperty,freeze,fromEntries,isError,stringEndsWith,stringIncludes,stringSplit,weaksetAdd,weaksetHas;$h‍_imports([["../commons.js", [["WeakSet", [$h‍_a => (WeakSet = $h‍_a)]],["arrayFilter", [$h‍_a => (arrayFilter = $h‍_a)]],["arrayFlatMap", [$h‍_a => (arrayFlatMap = $h‍_a)]],["arrayMap", [$h‍_a => (arrayMap = $h‍_a)]],["arrayPop", [$h‍_a => (arrayPop = $h‍_a)]],["arrayPush", [$h‍_a => (arrayPush = $h‍_a)]],["defineProperty", [$h‍_a => (defineProperty = $h‍_a)]],["freeze", [$h‍_a => (freeze = $h‍_a)]],["fromEntries", [$h‍_a => (fromEntries = $h‍_a)]],["isError", [$h‍_a => (isError = $h‍_a)]],["stringEndsWith", [$h‍_a => (stringEndsWith = $h‍_a)]],["stringIncludes", [$h‍_a => (stringIncludes = $h‍_a)]],["stringSplit", [$h‍_a => (stringSplit = $h‍_a)]],["weaksetAdd", [$h‍_a => (weaksetAdd = $h‍_a)]],["weaksetHas", [$h‍_a => (weaksetHas = $h‍_a)]]]],["./types.js", []],["./internal-types.js", []]]);   


























// For our internal debugging purposes, uncomment
// const internalDebugConsole = console;

// The whitelists of console methods, from:
// Whatwg "living standard" https://console.spec.whatwg.org/
// Node https://nodejs.org/dist/latest-v14.x/docs/api/console.html
// MDN https://developer.mozilla.org/en-US/docs/Web/API/Console_API
// TypeScript https://openstapps.gitlab.io/projectmanagement/interfaces/_node_modules__types_node_globals_d_.console.html
// Chrome https://developers.google.com/web/tools/chrome-devtools/console/api

// All console level methods have parameters (fmt?, ...args)
// where the argument sequence `fmt?, ...args` formats args according to
// fmt if fmt is a format string. Otherwise, it just renders them all as values
// separated by spaces.
// https://console.spec.whatwg.org/#formatter
// https://nodejs.org/docs/latest/api/util.html#util_util_format_format_args

// For the causal console, all occurrences of `fmt, ...args` or `...args` by
// itself must check for the presence of an error to ask the
// `loggedErrorHandler` to handle.
// In theory we should do a deep inspection to detect for example an array
// containing an error. We currently do not detect these and may never.

/** @typedef {keyof VirtualConsole | 'profile' | 'profileEnd'} ConsoleProps */

/**
 * Those console methods whose actual parameters are `(fmt?, ...args)`
 * even if their TypeScript types claim otherwise.
 *
 * Each is paired with what we consider to be their log severity level.
 * This is the same as the log severity of these on other
 * platform console implementations when they all agree.
 *
 * @type {readonly [ConsoleProps, LogSeverity | undefined][]}
 */
const        consoleLevelMethods=  freeze([
  ['debug', 'debug'], // (fmt?, ...args) verbose level on Chrome
  ['log', 'log'], // (fmt?, ...args) info level on Chrome
  ['info', 'info'], // (fmt?, ...args)
  ['warn', 'warn'], // (fmt?, ...args)
  ['error', 'error'], // (fmt?, ...args)

  ['trace', 'log'], // (fmt?, ...args)
  ['dirxml', 'log'], // (fmt?, ...args)          but TS typed (...data)
  ['group', 'log'], // (fmt?, ...args)           but TS typed (...label)
  ['groupCollapsed', 'log']  // (fmt?, ...args)  but TS typed (...label)
]);

/**
 * Those console methods other than those already enumerated by
 * `consoleLevelMethods`.
 *
 * Each is paired with what we consider to be their log severity level.
 * This is the same as the log severity of these on other
 * platform console implementations when they all agree.
 *
 * @type {readonly [ConsoleProps, LogSeverity | undefined][]}
 */$h‍_once.consoleLevelMethods(consoleLevelMethods);
const        consoleOtherMethods=  freeze([
  ['assert', 'error'], // (value, fmt?, ...args)
  ['timeLog', 'log'], // (label?, ...args) no fmt string

  // Insensitive to whether any argument is an error. All arguments can pass
  // thru to baseConsole as is.
  ['clear', undefined], // ()
  ['count', 'info'], // (label?)
  ['countReset', undefined], // (label?)
  ['dir', 'log'], // (item, options?)
  ['groupEnd', 'log'], // ()
  // In theory tabular data may be or contain an error. However, we currently
  // do not detect these and may never.
  ['table', 'log'], // (tabularData, properties?)
  ['time', 'info'], // (label?)
  ['timeEnd', 'info'], // (label?)

  // Node Inspector only, MDN, and TypeScript, but not whatwg
  ['profile', undefined], // (label?)
  ['profileEnd', undefined], // (label?)
  ['timeStamp', undefined]  // (label?)
]);

/** @type {readonly [ConsoleProps, LogSeverity | undefined][]} */$h‍_once.consoleOtherMethods(consoleOtherMethods);
const consoleWhitelist=  freeze([
  ...consoleLevelMethods,
  ...consoleOtherMethods]);


/**
 * consoleOmittedProperties is currently unused. I record and maintain it here
 * with the intention that it be treated like the `false` entries in the main
 * SES whitelist: that seeing these on the original console is expected, but
 * seeing anything else that's outside the whitelist is surprising and should
 * provide a diagnostic.
 *
 * const consoleOmittedProperties = freeze([
 *   'memory', // Chrome
 *   'exception', // FF, MDN
 *   '_ignoreErrors', // Node
 *   '_stderr', // Node
 *   '_stderrErrorHandler', // Node
 *   '_stdout', // Node
 *   '_stdoutErrorHandler', // Node
 *   '_times', // Node
 *   'context', // Chrome, Node
 *   'record', // Safari
 *   'recordEnd', // Safari
 *
 *   'screenshot', // Safari
 *   // Symbols
 *   '@@toStringTag', // Chrome: "Object", Safari: "Console"
 *   // A variety of other symbols also seen on Node
 * ]);
 */

// //////////////////////////// Logging Console ////////////////////////////////

/** @type {MakeLoggingConsoleKit} */
const        makeLoggingConsoleKit=  (
  loggedErrorHandler,
  { shouldResetForDebugging=  false}=   {})=>
     {
  if( shouldResetForDebugging) {
    // eslint-disable-next-line @endo/no-polymorphic-call
    loggedErrorHandler.resetErrorTagNum();
   }

  // Not frozen!
  let logArray=  [];

  const loggingConsole=  fromEntries(
    arrayMap(consoleWhitelist, ([name, _])=>  {
      // Use an arrow function so that it doesn't come with its own name in
      // its printed form. Instead, we're hoping that tooling uses only
      // the `.name` property set below.
      /**
       * @param {...any} args
       */
      const method=  (...args)=>  {
        arrayPush(logArray, [name, ...args]);
       };
      defineProperty(method, 'name', { value: name});
      return [name, freeze(method)];
     }));

  freeze(loggingConsole);

  const takeLog=  ()=>  {
    const result=  freeze(logArray);
    logArray=  [];
    return result;
   };
  freeze(takeLog);

  const typedLoggingConsole=  /** @type {VirtualConsole} */  loggingConsole;

  return freeze({ loggingConsole: typedLoggingConsole, takeLog});
 };$h‍_once.makeLoggingConsoleKit(makeLoggingConsoleKit);
freeze(makeLoggingConsoleKit);

/**
 * Makes the same calls on a `baseConsole` that were made on a
 * `loggingConsole` to produce this `log`. In this way, a logging console
 * can be used as a buffer to delay the application of these calls to a
 * `baseConsole`.
 *
 * @param {LogRecord[]} log
 * @param {VirtualConsole} baseConsole
 */
const        pumpLogToConsole=  (log, baseConsole)=>  {
  for( const [name, ...args]of  log) {
    // eslint-disable-next-line @endo/no-polymorphic-call
    baseConsole[name](...args);
   }
 };
// //////////////////////////// Causal Console /////////////////////////////////

/** @type {ErrorInfo} */$h‍_once.pumpLogToConsole(pumpLogToConsole);
const ErrorInfo=  {
  NOTE: 'ERROR_NOTE:',
  MESSAGE: 'ERROR_MESSAGE:',
  CAUSE: 'cause:',
  ERRORS: 'errors:'};

freeze(ErrorInfo);

/** @type {MakeCausalConsole} */
const        makeCausalConsole=  (baseConsole, loggedErrorHandler)=>  {
  if( !baseConsole) {
    return undefined;
   }

  const { getStackString, tagError, takeMessageLogArgs, takeNoteLogArgsArray}=
    loggedErrorHandler;

  /**
   * @param {ReadonlyArray<any>} logArgs
   * @param {Array<any>} subErrorsSink
   * @returns {any}
   */
  const extractErrorArgs=  (logArgs, subErrorsSink)=>  {
    const argTags=  arrayMap(logArgs, (arg)=>{
      if( isError(arg)) {
        arrayPush(subErrorsSink, arg);
        return  `(${tagError(arg)})`;
       }
      return arg;
     });
    return argTags;
   };

  /**
   * @param {LogSeverity} severity
   * @param {Error} error
   * @param {ErrorInfoKind} kind
   * @param {readonly any[]} logArgs
   * @param {Array<Error>} subErrorsSink
   */
  const logErrorInfo=  (severity, error, kind, logArgs, subErrorsSink)=>  {
    const errorTag=  tagError(error);
    const errorName=
      kind===  ErrorInfo.MESSAGE?   `${errorTag}:`:  `${errorTag} ${kind}`;
    const argTags=  extractErrorArgs(logArgs, subErrorsSink);
    // eslint-disable-next-line @endo/no-polymorphic-call
    baseConsole[severity](errorName, ...argTags);
   };

  /**
   * Logs the `subErrors` within a group name mentioning `optTag`.
   *
   * @param {LogSeverity} severity
   * @param {Error[]} subErrors
   * @param {string | undefined} optTag
   * @returns {void}
   */
  const logSubErrors=  (severity, subErrors, optTag=  undefined)=>  {
    if( subErrors.length===  0) {
      return;
     }
    if( subErrors.length===  1&&  optTag===  undefined) {
      // eslint-disable-next-line no-use-before-define
      logError(severity, subErrors[0]);
      return;
     }
    let label;
    if( subErrors.length===  1) {
      label=   `Nested error`;
     }else {
      label=   `Nested ${subErrors.length} errors`;
     }
    if( optTag!==  undefined) {
      label=   `${label} under ${optTag}`;
     }
    // eslint-disable-next-line @endo/no-polymorphic-call
    baseConsole.group(label);
    try {
      for( const subError of subErrors) {
        // eslint-disable-next-line no-use-before-define
        logError(severity, subError);
       }
     }finally {
      // eslint-disable-next-line @endo/no-polymorphic-call
      baseConsole.groupEnd();
     }
   };

  const errorsLogged=  new WeakSet();

  /** @type {(severity: LogSeverity) => NoteCallback} */
  const makeNoteCallback=  (severity)=>(error, noteLogArgs)=>  {
    const subErrors=  [];
    // Annotation arrived after the error has already been logged,
    // so just log the annotation immediately, rather than remembering it.
    logErrorInfo(severity, error, ErrorInfo.NOTE, noteLogArgs, subErrors);
    logSubErrors(severity, subErrors, tagError(error));
   };

  /**
   * @param {LogSeverity} severity
   * @param {Error} error
   */
  const logError=  (severity, error)=>  {
    if( weaksetHas(errorsLogged, error)) {
      return;
     }
    const errorTag=  tagError(error);
    weaksetAdd(errorsLogged, error);
    const subErrors=  [];
    const messageLogArgs=  takeMessageLogArgs(error);
    const noteLogArgsArray=  takeNoteLogArgsArray(
      error,
      makeNoteCallback(severity));

    // Show the error's most informative error message
    if( messageLogArgs===  undefined) {
      // If there is no message log args, then just show the message that
      // the error itself carries.
      // eslint-disable-next-line @endo/no-polymorphic-call
      baseConsole[severity]( `${errorTag}:`,error.message);
     }else {
      // If there is one, we take it to be strictly more informative than the
      // message string carried by the error, so show it *instead*.
      logErrorInfo(
        severity,
        error,
        ErrorInfo.MESSAGE,
        messageLogArgs,
        subErrors);

     }
    // After the message but before any other annotations, show the stack.
    let stackString=  getStackString(error);
    if(
      typeof stackString===  'string'&&
      stackString.length>=  1&&
      !stringEndsWith(stackString, '\n'))
      {
      stackString+=  '\n';
     }
    // eslint-disable-next-line @endo/no-polymorphic-call
    baseConsole[severity](stackString);
    // Show the other annotations on error
    if( error.cause) {
      logErrorInfo(severity, error, ErrorInfo.CAUSE, [error.cause], subErrors);
     }
    // @ts-expect-error AggregateError has an `errors` property.
    if( error.errors) {
      // @ts-expect-error AggregateError has an `errors` property.
      logErrorInfo(severity, error, ErrorInfo.ERRORS, error.errors, subErrors);
     }
    for( const noteLogArgs of noteLogArgsArray) {
      logErrorInfo(severity, error, ErrorInfo.NOTE, noteLogArgs, subErrors);
     }
    // explain all the errors seen in the messages already emitted.
    logSubErrors(severity, subErrors, errorTag);
   };

  const levelMethods=  arrayMap(consoleLevelMethods, ([level, _])=>  {
    /**
     * @param {...any} logArgs
     */
    const levelMethod=  (...logArgs)=>  {
      const subErrors=  [];
      const argTags=  extractErrorArgs(logArgs, subErrors);
      // eslint-disable-next-line @endo/no-polymorphic-call
      baseConsole[level](...argTags);
      // @ts-expect-error ConsoleProp vs LogSeverity mismatch
      logSubErrors(level, subErrors);
     };
    defineProperty(levelMethod, 'name', { value: level});
    return [level, freeze(levelMethod)];
   });
  const otherMethodNames=  arrayFilter(
    consoleOtherMethods,
    ([name, _])=>  name in baseConsole);

  const otherMethods=  arrayMap(otherMethodNames, ([name, _])=>  {
    /**
     * @param {...any} args
     */
    const otherMethod=  (...args)=>  {
      // @ts-ignore
      // eslint-disable-next-line @endo/no-polymorphic-call
      baseConsole[name](...args);
      return undefined;
     };
    defineProperty(otherMethod, 'name', { value: name});
    return [name, freeze(otherMethod)];
   });

  const causalConsole=  fromEntries([...levelMethods, ...otherMethods]);
  return (/** @type {VirtualConsole} */ freeze(causalConsole));
 };$h‍_once.makeCausalConsole(makeCausalConsole);
freeze(makeCausalConsole);

/**
 * @typedef {(...args: unknown[]) => void} Logger
 */

/**
 * This is a rather horrible kludge to indent the output to a logger in
 * the case where some arguments are strings containing newlines. Part of
 * the problem is that console-like loggers, including the one in ava,
 * join the string arguments of the log message with a space.
 * Because of this, there's an extra space at the beginning of each of
 * the split lines. So this kludge compensated by putting an extra empty
 * string at the beginning, so that the logger will add the same extra
 * joiner.
 * TODO: Fix this horrible kludge, and indent in a sane manner.
 *
 * @param {string} str
 * @param {string} sep
 * @param {string[]} indents
 * @returns {string[]}
 */
const indentAfterAllSeps=  (str, sep, indents)=>  {
  const [firstLine, ...restLines]=  stringSplit(str, sep);
  const indentedRest=  arrayFlatMap(restLines, (line)=>[sep, ...indents, line]);
  return ['', firstLine, ...indentedRest];
 };

/**
 * @param {LoggedErrorHandler} loggedErrorHandler
 */
const        defineCausalConsoleFromLogger=  (loggedErrorHandler)=>{
  /**
   * Implement the `VirtualConsole` API badly by turning all calls into
   * calls on `tlogger`. We need to do this to have `console` logging
   * turn into calls to Ava's `t.log`, so these console log messages
   * are output in the right place.
   *
   * @param {Logger} tlogger
   * @returns {VirtualConsole}
   */
  const makeCausalConsoleFromLogger=  (tlogger)=>{
    const indents=  [];
    const logWithIndent=  (...args)=>  {
      if( indents.length>  0) {
        args=  arrayFlatMap(args, (arg)=>
          typeof arg===  'string'&&  stringIncludes(arg, '\n')?
              indentAfterAllSeps(arg, '\n', indents):
              [arg]);

        args=  [...indents, ...args];
       }
      return tlogger(...args);
     };
    const makeNamed=  (name, fn)=>
      ({ [name]: (...args)=>  fn(...args)})[ name];

    const baseConsole=  fromEntries([
      ...arrayMap(consoleLevelMethods, ([name])=>  [
        name,
        makeNamed(name, logWithIndent)]),

      ...arrayMap(consoleOtherMethods, ([name])=>  [
        name,
        makeNamed(name, (...args)=>  logWithIndent(name, ...args))])]);


    // https://console.spec.whatwg.org/#grouping
    for( const name of ['group', 'groupCollapsed']) {
      if( baseConsole[name]) {
        baseConsole[name]=  makeNamed(name, (...args)=>  {
          if( args.length>=  1) {
            // Prefix the logged data with "group" or "groupCollapsed".
            logWithIndent(...args);
           }
          // A single space is enough;
          // the host console will separate them with additional spaces.
          arrayPush(indents, ' ');
         });
       }
     }
    if( baseConsole.groupEnd) {
      baseConsole.groupEnd=  makeNamed('groupEnd', (...args)=>  {
        arrayPop(indents);
       });
     }
    harden(baseConsole);
    const causalConsole=  makeCausalConsole(
      /** @type {VirtualConsole} */  baseConsole,
      loggedErrorHandler);

    return (/** @type {VirtualConsole} */ causalConsole);
   };
  return freeze(makeCausalConsoleFromLogger);
 };$h‍_once.defineCausalConsoleFromLogger(defineCausalConsoleFromLogger);
freeze(defineCausalConsoleFromLogger);

// ///////////////////////// Filter Console ////////////////////////////////////

/** @type {FilterConsole} */
const        filterConsole=  (baseConsole, filter, _topic=  undefined)=>  {
  // TODO do something with optional topic string
  const whitelist=  arrayFilter(
    consoleWhitelist,
    ([name, _])=>  name in baseConsole);

  const methods=  arrayMap(whitelist, ([name, severity])=>  {
    /**
     * @param {...any} args
     */
    const method=  (...args)=>  {
      // eslint-disable-next-line @endo/no-polymorphic-call
      if( severity===  undefined||  filter.canLog(severity)) {
        // @ts-ignore
        // eslint-disable-next-line @endo/no-polymorphic-call
        baseConsole[name](...args);
       }
     };
    return [name, freeze(method)];
   });
  const filteringConsole=  fromEntries(methods);
  return (/** @type {VirtualConsole} */ freeze(filteringConsole));
 };$h‍_once.filterConsole(filterConsole);
freeze(filterConsole);
})()
,
// === functors[35] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let FinalizationRegistry,Map,mapGet,mapDelete,WeakMap,mapSet,finalizationRegistryRegister,weakmapSet,weakmapGet,mapEntries,mapHas;$h‍_imports([["../commons.js", [["FinalizationRegistry", [$h‍_a => (FinalizationRegistry = $h‍_a)]],["Map", [$h‍_a => (Map = $h‍_a)]],["mapGet", [$h‍_a => (mapGet = $h‍_a)]],["mapDelete", [$h‍_a => (mapDelete = $h‍_a)]],["WeakMap", [$h‍_a => (WeakMap = $h‍_a)]],["mapSet", [$h‍_a => (mapSet = $h‍_a)]],["finalizationRegistryRegister", [$h‍_a => (finalizationRegistryRegister = $h‍_a)]],["weakmapSet", [$h‍_a => (weakmapSet = $h‍_a)]],["weakmapGet", [$h‍_a => (weakmapGet = $h‍_a)]],["mapEntries", [$h‍_a => (mapEntries = $h‍_a)]],["mapHas", [$h‍_a => (mapHas = $h‍_a)]]]]]);   














/**
 * Create rejection-tracking machinery compatible with Node.js and browsers.
 *
 * Note that modern browsers *prevent* access to the 'unhandledrejection' and
 * 'rejectionhandled' events needed:
 * - in cross-origin mode, like when served from file://
 * - in the browser console (interactively typed-in code)
 * - in the debugger
 *
 * Then, they just look like: `Uncaught (in promise) Error: ...` and don't
 * implement the machinery.
 *
 * The solution is to serve your web page from an http:// or https:// web server
 * and execute actual code.
 *
 * @param {(reason: unknown) => void} reportReason report the reason for an
 * unhandled rejection.
 */
const        makeRejectionHandlers=  (reportReason)=>{
  if( FinalizationRegistry===  undefined) {
    return undefined;
   }

  /** @typedef {number} ReasonId */
  let lastReasonId=  0;

  /** @type {Map<ReasonId, unknown>} */
  const idToReason=  new Map();

  /** @type {(() => void) | undefined} */
  let cancelChecking;

  const removeReasonId=  (reasonId)=>{
    mapDelete(idToReason, reasonId);
    if( cancelChecking&&  idToReason.size===  0) {
      // No more unhandled rejections to check, just cancel the check.
      cancelChecking();
      cancelChecking=  undefined;
     }
   };

  /** @type {WeakMap<Promise, ReasonId>} */
  const promiseToReasonId=  new WeakMap();

  /**
   * Clean up and report the reason for a GCed unhandled rejection.
   *
   * @param {ReasonId} heldReasonId
   */
  const finalizeDroppedPromise=  (heldReasonId)=>{
    if( mapHas(idToReason, heldReasonId)) {
      const reason=  mapGet(idToReason, heldReasonId);
      removeReasonId(heldReasonId);
      reportReason(reason);
     }
   };

  /** @type {FinalizationRegistry<ReasonId>} */
  const promiseToReason=  new FinalizationRegistry(finalizeDroppedPromise);

  /**
   * Track a rejected promise and its corresponding reason if there is no
   * rejection handler synchronously attached.
   *
   * @param {unknown} reason
   * @param {Promise} pr
   */
  const unhandledRejectionHandler=  (reason, pr)=>  {
    lastReasonId+=  1;
    const reasonId=  lastReasonId;

    // Update bookkeeping.
    mapSet(idToReason, reasonId, reason);
    weakmapSet(promiseToReasonId, pr, reasonId);
    finalizationRegistryRegister(promiseToReason, pr, reasonId, pr);
   };

  /**
   * Deal with the addition of a handler to a previously rejected promise.
   *
   * Just remove it from our list.  Let the FinalizationRegistry or
   * processTermination report any GCed unhandled rejected promises.
   *
   * @param {Promise} pr
   */
  const rejectionHandledHandler=  (pr)=>{
    const reasonId=  weakmapGet(promiseToReasonId, pr);
    removeReasonId(reasonId);
   };

  /**
   * Report all the unhandled rejections, now that we are abruptly terminating
   * the agent cluster.
   */
  const processTerminationHandler=  ()=>  {
    for( const [reasonId, reason]of  mapEntries(idToReason)) {
      removeReasonId(reasonId);
      reportReason(reason);
     }
   };

  return {
    rejectionHandledHandler,
    unhandledRejectionHandler,
    processTerminationHandler};

 };$h‍_once.makeRejectionHandlers(makeRejectionHandlers);
})()
,
// === functors[36] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let TypeError,apply,defineProperty,freeze,globalThis,defaultHandler,makeCausalConsole,makeRejectionHandlers;$h‍_imports([["../commons.js", [["TypeError", [$h‍_a => (TypeError = $h‍_a)]],["apply", [$h‍_a => (apply = $h‍_a)]],["defineProperty", [$h‍_a => (defineProperty = $h‍_a)]],["freeze", [$h‍_a => (freeze = $h‍_a)]],["globalThis", [$h‍_a => (globalThis = $h‍_a)]]]],["./assert.js", [["loggedErrorHandler", [$h‍_a => (defaultHandler = $h‍_a)]]]],["./console.js", [["makeCausalConsole", [$h‍_a => (makeCausalConsole = $h‍_a)]]]],["./unhandled-rejection.js", [["makeRejectionHandlers", [$h‍_a => (makeRejectionHandlers = $h‍_a)]]]],["./types.js", []],["./internal-types.js", []]]);   















const failFast=  (message)=>{
  throw TypeError(message);
 };

const wrapLogger=  (logger, thisArg)=>
  freeze((...args)=>  apply(logger, thisArg, args));

/**
 * Wrap console unless suppressed.
 * At the moment, the console is considered a host power in the start
 * compartment, and not a primordial. Hence it is absent from the whilelist
 * and bypasses the intrinsicsCollector.
 *
 * @param {"safe" | "unsafe"} consoleTaming
 * @param {"platform" | "exit" | "abort" | "report" | "none"} [errorTrapping]
 * @param {"report" | "none"} [unhandledRejectionTrapping]
 * @param {GetStackString=} optGetStackString
 */
const        tameConsole=  (
  consoleTaming=  'safe',
  errorTrapping=  'platform',
  unhandledRejectionTrapping=  'report',
  optGetStackString=  undefined)=>
     {
  consoleTaming===  'safe'||
    consoleTaming===  'unsafe'||
    failFast( `unrecognized consoleTaming ${consoleTaming}`);

  let loggedErrorHandler;
  if( optGetStackString===  undefined) {
    loggedErrorHandler=  defaultHandler;
   }else {
    loggedErrorHandler=  {
      ...defaultHandler,
      getStackString: optGetStackString};

   }

  // eslint-disable-next-line no-restricted-globals
  const originalConsole=  /** @type {VirtualConsole} */
    // eslint-disable-next-line no-nested-ternary
    typeof globalThis.console!==  'undefined'?
        globalThis.console:
        typeof globalThis.print===  'function'?
          // Make a good-enough console for eshost (including only functions that
          // log at a specific level with no special argument interpretation).
          // https://console.spec.whatwg.org/#logging
          ((p)=>freeze({ debug: p, log: p, info: p, warn: p, error: p}))(
            // eslint-disable-next-line no-undef
            wrapLogger(globalThis.print)):

          undefined;


  // Upgrade a log-only console (as in `eshost -h SpiderMonkey`).
  if( originalConsole&&  originalConsole.log) {
    for( const methodName of ['warn', 'error']) {
      if( !originalConsole[methodName]) {
        defineProperty(originalConsole, methodName, {
          value: wrapLogger(originalConsole.log, originalConsole)});

       }
     }
   }

  const ourConsole=  /** @type {VirtualConsole} */
    consoleTaming===  'unsafe'?
        originalConsole:
        makeCausalConsole(originalConsole, loggedErrorHandler);


  // Attach platform-specific error traps such that any error that gets thrown
  // at top-of-turn (the bottom of stack) will get logged by our causal
  // console, revealing the diagnostic information associated with the error,
  // including the stack from when the error was created.

  // In the following Node.js and web browser cases, `process` and `window` are
  // spelled as `globalThis` properties to avoid the overweaning gaze of
  // Parcel, which dutifully installs an unnecessary `process` shim if we ever
  // utter that. That unnecessary shim forces the whole bundle into sloppy mode,
  // which in turn breaks SES's strict mode invariant.

  // Disable the polymorphic check for the rest of this file.  It's too noisy
  // when dealing with platform APIs.
  /* eslint-disable @endo/no-polymorphic-call */

  // Node.js
  const globalProcess=  globalThis.process||  undefined;
  if(
    errorTrapping!==  'none'&&
    typeof globalProcess===  'object'&&
    typeof globalProcess.on===  'function')
    {
    let terminate;
    if( errorTrapping===  'platform'||  errorTrapping===  'exit') {
      const { exit}=   globalProcess;
      // If there is a function-valued process.on but no function-valued process.exit,
      // fail early without caring whether errorTrapping is "platform" only by default.
      typeof exit===  'function'||  failFast('missing process.exit');
      terminate=  ()=>  exit(globalProcess.exitCode||  -1);
     }else if( errorTrapping===  'abort') {
      terminate=  globalProcess.abort;
      typeof terminate===  'function'||  failFast('missing process.abort');
     }

    globalProcess.on('uncaughtException', (error)=>{
      // causalConsole is born frozen so not vulnerable to method tampering.
      ourConsole.error(error);
      if( terminate) {
        terminate();
       }
     });
   }
  if(
    unhandledRejectionTrapping!==  'none'&&
    typeof globalProcess===  'object'&&
    typeof globalProcess.on===  'function')
    {
    const handleRejection=  (reason)=>{
      // 'platform' and 'report' just log the reason.
      ourConsole.error('SES_UNHANDLED_REJECTION:', reason);
     };
    // Maybe track unhandled promise rejections.
    const h=  makeRejectionHandlers(handleRejection);
    if( h) {
      // Rejection handlers are supported.
      globalProcess.on('unhandledRejection', h.unhandledRejectionHandler);
      globalProcess.on('rejectionHandled', h.rejectionHandledHandler);
      globalProcess.on('exit', h.processTerminationHandler);
     }
   }

  // Browser
  const globalWindow=  globalThis.window||  undefined;
  if(
    errorTrapping!==  'none'&&
    typeof globalWindow===  'object'&&
    typeof globalWindow.addEventListener===  'function')
    {
    globalWindow.addEventListener('error', (event)=>{
      event.preventDefault();
      // 'platform' and 'report' just log the reason.
      ourConsole.error(event.error);
      if( errorTrapping===  'exit'||  errorTrapping===  'abort') {
        globalWindow.location.href=   `about:blank`;
       }
     });
   }
  if(
    unhandledRejectionTrapping!==  'none'&&
    typeof globalWindow===  'object'&&
    typeof globalWindow.addEventListener===  'function')
    {
    const handleRejection=  (reason)=>{
      ourConsole.error('SES_UNHANDLED_REJECTION:', reason);
     };

    const h=  makeRejectionHandlers(handleRejection);
    if( h) {
      // Rejection handlers are supported.
      globalWindow.addEventListener('unhandledrejection', (event)=>{
        event.preventDefault();
        h.unhandledRejectionHandler(event.reason, event.promise);
       });

      globalWindow.addEventListener('rejectionhandled', (event)=>{
        event.preventDefault();
        h.rejectionHandledHandler(event.promise);
       });

      globalWindow.addEventListener('beforeunload', (_event)=>{
        h.processTerminationHandler();
       });
     }
   }
  /* eslint-enable @endo/no-polymorphic-call */

  return { console: ourConsole};
 };$h‍_once.tameConsole(tameConsole);
})()
,
// === functors[37] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let WeakMap,WeakSet,apply,arrayFilter,arrayJoin,arrayMap,arraySlice,create,defineProperties,fromEntries,reflectSet,regexpExec,regexpTest,weakmapGet,weakmapSet,weaksetAdd,weaksetHas;$h‍_imports([["../commons.js", [["WeakMap", [$h‍_a => (WeakMap = $h‍_a)]],["WeakSet", [$h‍_a => (WeakSet = $h‍_a)]],["apply", [$h‍_a => (apply = $h‍_a)]],["arrayFilter", [$h‍_a => (arrayFilter = $h‍_a)]],["arrayJoin", [$h‍_a => (arrayJoin = $h‍_a)]],["arrayMap", [$h‍_a => (arrayMap = $h‍_a)]],["arraySlice", [$h‍_a => (arraySlice = $h‍_a)]],["create", [$h‍_a => (create = $h‍_a)]],["defineProperties", [$h‍_a => (defineProperties = $h‍_a)]],["fromEntries", [$h‍_a => (fromEntries = $h‍_a)]],["reflectSet", [$h‍_a => (reflectSet = $h‍_a)]],["regexpExec", [$h‍_a => (regexpExec = $h‍_a)]],["regexpTest", [$h‍_a => (regexpTest = $h‍_a)]],["weakmapGet", [$h‍_a => (weakmapGet = $h‍_a)]],["weakmapSet", [$h‍_a => (weakmapSet = $h‍_a)]],["weaksetAdd", [$h‍_a => (weaksetAdd = $h‍_a)]],["weaksetHas", [$h‍_a => (weaksetHas = $h‍_a)]]]]]);   



















// Whitelist names from https://v8.dev/docs/stack-trace-api
// Whitelisting only the names used by error-stack-shim/src/v8StackFrames
// callSiteToFrame to shim the error stack proposal.
const safeV8CallSiteMethodNames=  [
  // suppress 'getThis' definitely
  'getTypeName',
  // suppress 'getFunction' definitely
  'getFunctionName',
  'getMethodName',
  'getFileName',
  'getLineNumber',
  'getColumnNumber',
  'getEvalOrigin',
  'isToplevel',
  'isEval',
  'isNative',
  'isConstructor',
  'isAsync',
  // suppress 'isPromiseAll' for now
  // suppress 'getPromiseIndex' for now

  // Additional names found by experiment, absent from
  // https://v8.dev/docs/stack-trace-api
  'getPosition',
  'getScriptNameOrSourceURL',

  'toString'  // TODO replace to use only whitelisted info
];

// TODO this is a ridiculously expensive way to attenuate callsites.
// Before that matters, we should switch to a reasonable representation.
const safeV8CallSiteFacet=  (callSite)=>{
  const methodEntry=  (name)=>{
    const method=  callSite[name];
    return [name, ()=>  apply(method, callSite, [])];
   };
  const o=  fromEntries(arrayMap(safeV8CallSiteMethodNames, methodEntry));
  return create(o, {});
 };

const safeV8SST=  (sst)=>arrayMap(sst, safeV8CallSiteFacet);

// If it has `/node_modules/` anywhere in it, on Node it is likely
// to be a dependent package of the current package, and so to
// be an infrastructure frame to be dropped from concise stack traces.
const FILENAME_NODE_DEPENDENTS_CENSOR=  /\/node_modules\//;

// If it begins with `internal/` or `node:internal` then it is likely
// part of the node infrustructre itself, to be dropped from concise
// stack traces.
const FILENAME_NODE_INTERNALS_CENSOR=  /^(?:node:)?internal\//;

// Frames within the `assert.js` package should be dropped from
// concise stack traces, as these are just steps towards creating the
// error object in question.
const FILENAME_ASSERT_CENSOR=  /\/packages\/ses\/src\/error\/assert.js$/;

// Frames within the `eventual-send` shim should be dropped so that concise
// deep stacks omit the internals of the eventual-sending mechanism causing
// asynchronous messages to be sent.
// Note that the eventual-send package will move from agoric-sdk to
// Endo, so this rule will be of general interest.
const FILENAME_EVENTUAL_SEND_CENSOR=  /\/packages\/eventual-send\/src\//;

// Any stack frame whose `fileName` matches any of these censor patterns
// will be omitted from concise stacks.
// TODO Enable users to configure FILENAME_CENSORS via `lockdown` options.
const FILENAME_CENSORS=  [
  FILENAME_NODE_DEPENDENTS_CENSOR,
  FILENAME_NODE_INTERNALS_CENSOR,
  FILENAME_ASSERT_CENSOR,
  FILENAME_EVENTUAL_SEND_CENSOR];


// Should a stack frame with this as its fileName be included in a concise
// stack trace?
// Exported only so it can be unit tested.
// TODO Move so that it applies not just to v8.
const        filterFileName=  (fileName)=>{
  if( !fileName) {
    // Stack frames with no fileName should appear in concise stack traces.
    return true;
   }
  for( const filter of FILENAME_CENSORS) {
    if( regexpTest(filter, fileName)) {
      return false;
     }
   }
  return true;
 };

// The ad-hoc rule of the current pattern is that any likely-file-path or
// likely url-path prefix, ending in a `/.../` should get dropped.
// Anything to the left of the likely path text is kept.
// Everything to the right of `/.../` is kept. Thus
// `'Object.bar (/vat-v1/.../eventual-send/test/test-deep-send.js:13:21)'`
// simplifies to
// `'Object.bar (eventual-send/test/test-deep-send.js:13:21)'`.
//
// See thread starting at
// https://github.com/Agoric/agoric-sdk/issues/2326#issuecomment-773020389
$h‍_once.filterFileName(filterFileName);const CALLSITE_ELLIPSES_PATTERN=/^((?:.*[( ])?)[:/\w_-]*\/\.\.\.\/(.+)$/;

// The ad-hoc rule of the current pattern is that any likely-file-path or
// likely url-path prefix, ending in a `/` and prior to `package/` should get
// dropped.
// Anything to the left of the likely path prefix text is kept. `package/` and
// everything to its right is kept. Thus
// `'Object.bar (/Users/markmiller/src/ongithub/agoric/agoric-sdk/packages/eventual-send/test/test-deep-send.js:13:21)'`
// simplifies to
// `'Object.bar (packages/eventual-send/test/test-deep-send.js:13:21)'`.
// Note that `/packages/` is a convention for monorepos encouraged by
// lerna.
const CALLSITE_PACKAGES_PATTERN=  /^((?:.*[( ])?)[:/\w_-]*\/(packages\/.+)$/;

// The use of these callSite patterns below assumes that any match will bind
// capture groups containing the parts of the original string we want
// to keep. The parts outside those capture groups will be dropped from concise
// stacks.
// TODO Enable users to configure CALLSITE_PATTERNS via `lockdown` options.
const CALLSITE_PATTERNS=  [
  CALLSITE_ELLIPSES_PATTERN,
  CALLSITE_PACKAGES_PATTERN];


// For a stack frame that should be included in a concise stack trace, if
// `callSiteString` is the original stringified stack frame, return the
// possibly-shorter stringified stack frame that should be shown instead.
// Exported only so it can be unit tested.
// TODO Move so that it applies not just to v8.
const        shortenCallSiteString=  (callSiteString)=>{
  for( const filter of CALLSITE_PATTERNS) {
    const match=  regexpExec(filter, callSiteString);
    if( match) {
      return arrayJoin(arraySlice(match, 1), '');
     }
   }
  return callSiteString;
 };$h‍_once.shortenCallSiteString(shortenCallSiteString);

const        tameV8ErrorConstructor=  (
  OriginalError,
  InitialError,
  errorTaming,
  stackFiltering)=>
     {
  // TODO: Proper CallSite types
  /** @typedef {{}} CallSite */

  const originalCaptureStackTrace=  OriginalError.captureStackTrace;

  // const callSiteFilter = _callSite => true;
  const callSiteFilter=  (callSite)=>{
    if( stackFiltering===  'verbose') {
      return true;
     }
    // eslint-disable-next-line @endo/no-polymorphic-call
    return filterFileName(callSite.getFileName());
   };

  const callSiteStringifier=  (callSite)=>{
    let callSiteString=   `${callSite}`;
    if( stackFiltering===  'concise') {
      callSiteString=  shortenCallSiteString(callSiteString);
     }
    return  `\n  at ${callSiteString}`;
   };

  const stackStringFromSST=  (_error, sst)=>
    arrayJoin(
      arrayMap(arrayFilter(sst, callSiteFilter), callSiteStringifier),
      '');


  /**
   * @typedef {object} StructuredStackInfo
   * @property {CallSite[]} callSites
   * @property {undefined} [stackString]
   */

  /**
   * @typedef {object} ParsedStackInfo
   * @property {undefined} [callSites]
   * @property {string} stackString
   */

  // Mapping from error instance to the stack for that instance.
  // The stack info is either the structured stack trace
  // or the generated tamed stack string
  /** @type {WeakMap<Error, ParsedStackInfo | StructuredStackInfo>} */
  const stackInfos=  new WeakMap();

  // Use concise methods to obtain named functions without constructors.
  const tamedMethods=  {
    // The optional `optFn` argument is for cutting off the bottom of
    // the stack --- for capturing the stack only above the topmost
    // call to that function. Since this isn't the "real" captureStackTrace
    // but instead calls the real one, if no other cutoff is provided,
    // we cut this one off.
    captureStackTrace(error, optFn=  tamedMethods.captureStackTrace) {
      if( typeof originalCaptureStackTrace===  'function') {
        // OriginalError.captureStackTrace is only on v8
        apply(originalCaptureStackTrace, OriginalError, [error, optFn]);
        return;
       }
      reflectSet(error, 'stack', '');
     },
    // Shim of proposed special power, to reside by default only
    // in the start compartment, for getting the stack traceback
    // string associated with an error.
    // See https://tc39.es/proposal-error-stacks/
    getStackString(error) {
      let stackInfo=  weakmapGet(stackInfos, error);

      if( stackInfo===  undefined) {
        // The following will call `prepareStackTrace()` synchronously
        // which will populate stackInfos
        // eslint-disable-next-line no-void
        void error.stack;
        stackInfo=  weakmapGet(stackInfos, error);
        if( !stackInfo) {
          stackInfo=  { stackString: ''};
          weakmapSet(stackInfos, error, stackInfo);
         }
       }

      // prepareStackTrace() may generate the stackString
      // if errorTaming === 'unsafe'

      if( stackInfo.stackString!==  undefined) {
        return stackInfo.stackString;
       }

      const stackString=  stackStringFromSST(error, stackInfo.callSites);
      weakmapSet(stackInfos, error, { stackString});

      return stackString;
     },
    prepareStackTrace(error, sst) {
      if( errorTaming===  'unsafe') {
        const stackString=  stackStringFromSST(error, sst);
        weakmapSet(stackInfos, error, { stackString});
        return  `${error}${stackString}`;
       }else {
        weakmapSet(stackInfos, error, { callSites: sst});
        return '';
       }
     }};


  // A prepareFn is a prepareStackTrace function.
  // An sst is a `structuredStackTrace`, which is an array of
  // callsites.
  // A user prepareFn is a prepareFn defined by a client of this API,
  // and provided by assigning to `Error.prepareStackTrace`.
  // A user prepareFn should only receive an attenuated sst, which
  // is an array of attenuated callsites.
  // A system prepareFn is the prepareFn created by this module to
  // be installed on the real `Error` constructor, to receive
  // an original sst, i.e., an array of unattenuated callsites.
  // An input prepareFn is a function the user assigns to
  // `Error.prepareStackTrace`, which might be a user prepareFn or
  // a system prepareFn previously obtained by reading
  // `Error.prepareStackTrace`.

  const defaultPrepareFn=  tamedMethods.prepareStackTrace;

  OriginalError.prepareStackTrace=  defaultPrepareFn;

  // A weakset branding some functions as system prepareFns, all of which
  // must be defined by this module, since they can receive an
  // unattenuated sst.
  const systemPrepareFnSet=  new WeakSet([defaultPrepareFn]);

  const systemPrepareFnFor=  (inputPrepareFn)=>{
    if( weaksetHas(systemPrepareFnSet, inputPrepareFn)) {
      return inputPrepareFn;
     }
    // Use concise methods to obtain named functions without constructors.
    const systemMethods=  {
      prepareStackTrace(error, sst) {
        weakmapSet(stackInfos, error, { callSites: sst});
        return inputPrepareFn(error, safeV8SST(sst));
       }};

    weaksetAdd(systemPrepareFnSet, systemMethods.prepareStackTrace);
    return systemMethods.prepareStackTrace;
   };

  // Note `stackTraceLimit` accessor already defined by
  // tame-error-constructor.js
  defineProperties(InitialError, {
    captureStackTrace: {
      value: tamedMethods.captureStackTrace,
      writable: true,
      enumerable: false,
      configurable: true},

    prepareStackTrace: {
      get() {
        return OriginalError.prepareStackTrace;
       },
      set(inputPrepareStackTraceFn) {
        if( typeof inputPrepareStackTraceFn===  'function') {
          const systemPrepareFn=  systemPrepareFnFor(inputPrepareStackTraceFn);
          OriginalError.prepareStackTrace=  systemPrepareFn;
         }else {
          OriginalError.prepareStackTrace=  defaultPrepareFn;
         }
       },
      enumerable: false,
      configurable: true}});



  return tamedMethods.getStackString;
 };$h‍_once.tameV8ErrorConstructor(tameV8ErrorConstructor);
})()
,
// === functors[38] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let FERAL_ERROR,TypeError,apply,construct,defineProperties,setPrototypeOf,getOwnPropertyDescriptor,defineProperty,NativeErrors,tameV8ErrorConstructor;$h‍_imports([["../commons.js", [["FERAL_ERROR", [$h‍_a => (FERAL_ERROR = $h‍_a)]],["TypeError", [$h‍_a => (TypeError = $h‍_a)]],["apply", [$h‍_a => (apply = $h‍_a)]],["construct", [$h‍_a => (construct = $h‍_a)]],["defineProperties", [$h‍_a => (defineProperties = $h‍_a)]],["setPrototypeOf", [$h‍_a => (setPrototypeOf = $h‍_a)]],["getOwnPropertyDescriptor", [$h‍_a => (getOwnPropertyDescriptor = $h‍_a)]],["defineProperty", [$h‍_a => (defineProperty = $h‍_a)]]]],["../permits.js", [["NativeErrors", [$h‍_a => (NativeErrors = $h‍_a)]]]],["./tame-v8-error-constructor.js", [["tameV8ErrorConstructor", [$h‍_a => (tameV8ErrorConstructor = $h‍_a)]]]]]);   












// Present on at least FF and XS. Proposed by Error-proposal. The original
// is dangerous, so tameErrorConstructor replaces it with a safe one.
// We grab the original here before it gets replaced.
const stackDesc=  getOwnPropertyDescriptor(FERAL_ERROR.prototype, 'stack');
const stackGetter=  stackDesc&&  stackDesc.get;

// Use concise methods to obtain named functions without constructors.
const tamedMethods=  {
  getStackString(error) {
    if( typeof stackGetter===  'function') {
      return apply(stackGetter, error, []);
     }else if( 'stack'in  error) {
      // The fallback is to just use the de facto `error.stack` if present
      return  `${error.stack}`;
     }
    return '';
   }};


function                tameErrorConstructor(
  errorTaming=  'safe',
  stackFiltering=  'concise')
  {
  if( errorTaming!==  'safe'&&  errorTaming!==  'unsafe') {
    throw TypeError( `unrecognized errorTaming ${errorTaming}`);
   }
  if( stackFiltering!==  'concise'&&  stackFiltering!==  'verbose') {
    throw TypeError( `unrecognized stackFiltering ${stackFiltering}`);
   }
  const ErrorPrototype=  FERAL_ERROR.prototype;

  const platform=
    typeof FERAL_ERROR.captureStackTrace===  'function'?  'v8':  'unknown';
  const { captureStackTrace: originalCaptureStackTrace}=   FERAL_ERROR;

  const makeErrorConstructor=  (_=  {})=>  {
    // eslint-disable-next-line no-shadow
    const ResultError=  function Error(...rest) {
      let error;
      if( new.target===  undefined) {
        error=  apply(FERAL_ERROR, this, rest);
       }else {
        error=  construct(FERAL_ERROR, rest, new.target);
       }
      if( platform===  'v8') {
        // TODO Likely expensive!
        apply(originalCaptureStackTrace, FERAL_ERROR, [error, ResultError]);
       }
      return error;
     };
    defineProperties(ResultError, {
      length: { value: 1},
      prototype: {
        value: ErrorPrototype,
        writable: false,
        enumerable: false,
        configurable: false}});


    return ResultError;
   };
  const InitialError=  makeErrorConstructor({ powers: 'original'});
  const SharedError=  makeErrorConstructor({ powers: 'none'});
  defineProperties(ErrorPrototype, {
    constructor: { value: SharedError}});


  for( const NativeError of NativeErrors) {
    setPrototypeOf(NativeError, SharedError);
   }

  // https://v8.dev/docs/stack-trace-api#compatibility advises that
  // programmers can "always" set `Error.stackTraceLimit`
  // even on non-v8 platforms. On non-v8
  // it will have no effect, but this advice only makes sense
  // if the assignment itself does not fail, which it would
  // if `Error` were naively frozen. Hence, we add setters that
  // accept but ignore the assignment on non-v8 platforms.
  defineProperties(InitialError, {
    stackTraceLimit: {
      get() {
        if( typeof FERAL_ERROR.stackTraceLimit===  'number') {
          // FERAL_ERROR.stackTraceLimit is only on v8
          return FERAL_ERROR.stackTraceLimit;
         }
        return undefined;
       },
      set(newLimit) {
        if( typeof newLimit!==  'number') {
          // silently do nothing. This behavior doesn't precisely
          // emulate v8 edge-case behavior. But given the purpose
          // of this emulation, having edge cases err towards
          // harmless seems the safer option.
          return;
         }
        if( typeof FERAL_ERROR.stackTraceLimit===  'number') {
          // FERAL_ERROR.stackTraceLimit is only on v8
          FERAL_ERROR.stackTraceLimit=  newLimit;
          // We place the useless return on the next line to ensure
          // that anything we place after the if in the future only
          // happens if the then-case does not.
          // eslint-disable-next-line no-useless-return
          return;
         }
       },
      // WTF on v8 stackTraceLimit is enumerable
      enumerable: false,
      configurable: true}});



  // The default SharedError much be completely powerless even on v8,
  // so the lenient `stackTraceLimit` accessor does nothing on all
  // platforms.
  defineProperties(SharedError, {
    stackTraceLimit: {
      get() {
        return undefined;
       },
      set(_newLimit) {
        // do nothing
       },
      enumerable: false,
      configurable: true}});



  if( platform===  'v8') {
    // `SharedError.prepareStackTrace`, if it exists, must also be
    // powerless. However, from what we've heard, depd expects to be able to
    // assign to it without the assignment throwing. It is normally a function
    // that returns a stack string to be magically added to error objects.
    // However, as long as we're adding a lenient standin, we may as well
    // accommodate any who expect to get a function they can call and get
    // a string back. This prepareStackTrace is a do-nothing function that
    // always returns the empty string.
    defineProperties(SharedError, {
      prepareStackTrace: {
        get() {
          return ()=>  '';
         },
        set(_prepareFn) {
          // do nothing
         },
        enumerable: false,
        configurable: true},

      captureStackTrace: {
        value: (errorish, _constructorOpt)=>  {
          defineProperty(errorish, 'stack', {
            value: ''});

         },
        writable: false,
        enumerable: false,
        configurable: true}});


   }

  let initialGetStackString=  tamedMethods.getStackString;
  if( platform===  'v8') {
    initialGetStackString=  tameV8ErrorConstructor(
      FERAL_ERROR,
      InitialError,
      errorTaming,
      stackFiltering);

   }else if( errorTaming===  'unsafe') {
    // v8 has too much magic around their 'stack' own property for it to
    // coexist cleanly with this accessor. So only install it on non-v8

    // Error.prototype.stack property as proposed at
    // https://tc39.es/proposal-error-stacks/
    // with the fix proposed at
    // https://github.com/tc39/proposal-error-stacks/issues/46
    // On others, this still protects from the override mistake,
    // essentially like enable-property-overrides.js would
    // once this accessor property itself is frozen, as will happen
    // later during lockdown.
    //
    // However, there is here a change from the intent in the current
    // state of the proposal. If experience tells us whether this change
    // is a good idea, we should modify the proposal accordingly. There is
    // much code in the world that assumes `error.stack` is a string. So
    // where the proposal accommodates secure operation by making the
    // property optional, we instead accommodate secure operation by
    // having the secure form always return only the stable part, the
    // stringified error instance, and omitting all the frame information
    // rather than omitting the property.
    defineProperties(ErrorPrototype, {
      stack: {
        get() {
          return initialGetStackString(this);
         },
        set(newValue) {
          defineProperties(this, {
            stack: {
              value: newValue,
              writable: true,
              enumerable: true,
              configurable: true}});


         }}});


   }else {
    // v8 has too much magic around their 'stack' own property for it to
    // coexist cleanly with this accessor. So only install it on non-v8
    defineProperties(ErrorPrototype, {
      stack: {
        get() {
          // https://github.com/tc39/proposal-error-stacks/issues/46
          // allows this to not add an unpleasant newline. Otherwise
          // we should fix this.
          return  `${this}`;
         },
        set(newValue) {
          defineProperties(this, {
            stack: {
              value: newValue,
              writable: true,
              enumerable: true,
              configurable: true}});


         }}});


   }

  return {
    '%InitialGetStackString%': initialGetStackString,
    '%InitialError%': InitialError,
    '%SharedError%': SharedError};

 }$h‍_once.default(     tameErrorConstructor);
})()
,
// === functors[39] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let getenv,ReferenceError,TypeError,Map,Set,arrayJoin,arrayMap,arrayPush,create,freeze,mapGet,mapHas,mapSet,setAdd,promiseThen,values,weakmapGet,generatorNext,generatorThrow,assert;$h‍_imports([["@endo/env-options", [["getEnvironmentOption", [$h‍_a => (getenv = $h‍_a)]]]],["./commons.js", [["ReferenceError", [$h‍_a => (ReferenceError = $h‍_a)]],["TypeError", [$h‍_a => (TypeError = $h‍_a)]],["Map", [$h‍_a => (Map = $h‍_a)]],["Set", [$h‍_a => (Set = $h‍_a)]],["arrayJoin", [$h‍_a => (arrayJoin = $h‍_a)]],["arrayMap", [$h‍_a => (arrayMap = $h‍_a)]],["arrayPush", [$h‍_a => (arrayPush = $h‍_a)]],["create", [$h‍_a => (create = $h‍_a)]],["freeze", [$h‍_a => (freeze = $h‍_a)]],["mapGet", [$h‍_a => (mapGet = $h‍_a)]],["mapHas", [$h‍_a => (mapHas = $h‍_a)]],["mapSet", [$h‍_a => (mapSet = $h‍_a)]],["setAdd", [$h‍_a => (setAdd = $h‍_a)]],["promiseThen", [$h‍_a => (promiseThen = $h‍_a)]],["values", [$h‍_a => (values = $h‍_a)]],["weakmapGet", [$h‍_a => (weakmapGet = $h‍_a)]],["generatorNext", [$h‍_a => (generatorNext = $h‍_a)]],["generatorThrow", [$h‍_a => (generatorThrow = $h‍_a)]]]],["./error/assert.js", [["assert", [$h‍_a => (assert = $h‍_a)]]]]]);   






























const { Fail, details: d, quote: q}=   assert;

const noop=  ()=>  { };

async function asyncTrampoline(generatorFunc, args, errorWrapper) {
  const iterator=  generatorFunc(...args);
  let result=  generatorNext(iterator);
  while( !result.done) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const val=  await result.value;
      result=  generatorNext(iterator, val);
     }catch( error) {
      result=  generatorThrow(iterator, errorWrapper(error));
     }
   }
  return result.value;
 }

function syncTrampoline(generatorFunc, args) {
  const iterator=  generatorFunc(...args);
  let result=  generatorNext(iterator);
  while( !result.done) {
    try {
      result=  generatorNext(iterator, result.value);
     }catch( error) {
      result=  generatorThrow(iterator, error);
     }
   }
  return result.value;
 }
// `makeAlias` constructs compartment specifier tuples for the `aliases`
// private field of compartments.
// These aliases allow a compartment to alias an internal module specifier to a
// module specifier in an external compartment, and also to create internal
// aliases.
// Both are facilitated by the moduleMap Compartment constructor option.
const        makeAlias=  (compartment, specifier)=>
  freeze({
    compartment,
    specifier});


// `resolveAll` pre-computes resolutions of all imports within the compartment
// in which a module was loaded.
$h‍_once.makeAlias(makeAlias);const resolveAll=(imports,resolveHook,fullReferrerSpecifier)=>{
  const resolvedImports=  create(null);
  for( const importSpecifier of imports) {
    const fullSpecifier=  resolveHook(importSpecifier, fullReferrerSpecifier);
    resolvedImports[importSpecifier]=  fullSpecifier;
   }
  return freeze(resolvedImports);
 };

const loadRecord=  (
  compartmentPrivateFields,
  moduleAliases,
  compartment,
  moduleSpecifier,
  staticModuleRecord,
  enqueueJob,
  selectImplementation,
  moduleLoads,
  importMeta)=>
     {
  const { resolveHook, moduleRecords}=   weakmapGet(
    compartmentPrivateFields,
    compartment);


  // resolve all imports relative to this referrer module.
  const resolvedImports=  resolveAll(
    staticModuleRecord.imports,
    resolveHook,
    moduleSpecifier);

  const moduleRecord=  freeze({
    compartment,
    staticModuleRecord,
    moduleSpecifier,
    resolvedImports,
    importMeta});


  // Enqueue jobs to load this module's shallow dependencies.
  for( const fullSpecifier of values(resolvedImports)) {
    // Behold: recursion.
    // eslint-disable-next-line no-use-before-define
    enqueueJob(memoizedLoadWithErrorAnnotation, [
      compartmentPrivateFields,
      moduleAliases,
      compartment,
      fullSpecifier,
      enqueueJob,
      selectImplementation,
      moduleLoads]);

   }

  // Memoize.
  mapSet(moduleRecords, moduleSpecifier, moduleRecord);
  return moduleRecord;
 };

function* loadWithoutErrorAnnotation(
  compartmentPrivateFields,
  moduleAliases,
  compartment,
  moduleSpecifier,
  enqueueJob,
  selectImplementation,
  moduleLoads)
  {
  const { importHook, importNowHook, moduleMap, moduleMapHook, moduleRecords}=
    weakmapGet(compartmentPrivateFields, compartment);

  // Follow moduleMap, or moduleMapHook if present.
  let aliasNamespace=  moduleMap[moduleSpecifier];
  if( aliasNamespace===  undefined&&  moduleMapHook!==  undefined) {
    aliasNamespace=  moduleMapHook(moduleSpecifier);
   }
  if( typeof aliasNamespace===  'string') {
    // eslint-disable-next-line @endo/no-polymorphic-call
    assert.fail(
      d `Cannot map module ${q(moduleSpecifier)} to ${q(
        aliasNamespace)
        } in parent compartment, not yet implemented`,
      TypeError);

   }else if( aliasNamespace!==  undefined) {
    const alias=  weakmapGet(moduleAliases, aliasNamespace);
    if( alias===  undefined) {
      // eslint-disable-next-line @endo/no-polymorphic-call
      assert.fail(
        d `Cannot map module ${q(
          moduleSpecifier)
          } because the value is not a module exports namespace, or is from another realm`,
        ReferenceError);

     }
    // Behold: recursion.
    // eslint-disable-next-line no-use-before-define
    const aliasRecord=  yield memoizedLoadWithErrorAnnotation(
      compartmentPrivateFields,
      moduleAliases,
      alias.compartment,
      alias.specifier,
      enqueueJob,
      selectImplementation,
      moduleLoads);

    mapSet(moduleRecords, moduleSpecifier, aliasRecord);
    return aliasRecord;
   }

  if( mapHas(moduleRecords, moduleSpecifier)) {
    return mapGet(moduleRecords, moduleSpecifier);
   }

  const staticModuleRecord=  yield selectImplementation(
    importHook,
    importNowHook)(
    moduleSpecifier);

  if( staticModuleRecord===  null||  typeof staticModuleRecord!==  'object') {
    Fail `importHook must return a promise for an object, for module ${q(
      moduleSpecifier)
      } in compartment ${q(compartment.name)}`;
   }

  // check if record is a RedirectStaticModuleInterface
  if( staticModuleRecord.specifier!==  undefined) {
    // check if this redirect with an explicit record
    if( staticModuleRecord.record!==  undefined) {
      // ensure expected record shape
      if( staticModuleRecord.compartment!==  undefined) {
        throw TypeError(
          'Cannot redirect to an explicit record with a specified compartment');

       }
      const {
        compartment: aliasCompartment=  compartment,
        specifier: aliasSpecifier=  moduleSpecifier,
        record: aliasModuleRecord,
        importMeta}=
          staticModuleRecord;

      const aliasRecord=  loadRecord(
        compartmentPrivateFields,
        moduleAliases,
        aliasCompartment,
        aliasSpecifier,
        aliasModuleRecord,
        enqueueJob,
        selectImplementation,
        moduleLoads,
        importMeta);

      mapSet(moduleRecords, moduleSpecifier, aliasRecord);
      return aliasRecord;
     }

    // check if this redirect with an explicit compartment
    if( staticModuleRecord.compartment!==  undefined) {
      // ensure expected record shape
      if( staticModuleRecord.importMeta!==  undefined) {
        throw TypeError(
          'Cannot redirect to an implicit record with a specified importMeta');

       }
      // Behold: recursion.
      // eslint-disable-next-line no-use-before-define
      const aliasRecord=  yield memoizedLoadWithErrorAnnotation(
        compartmentPrivateFields,
        moduleAliases,
        staticModuleRecord.compartment,
        staticModuleRecord.specifier,
        enqueueJob,
        selectImplementation,
        moduleLoads);

      mapSet(moduleRecords, moduleSpecifier, aliasRecord);
      return aliasRecord;
     }

    throw TypeError('Unnexpected RedirectStaticModuleInterface record shape');
   }

  return loadRecord(
    compartmentPrivateFields,
    moduleAliases,
    compartment,
    moduleSpecifier,
    staticModuleRecord,
    enqueueJob,
    selectImplementation,
    moduleLoads);

 }

const memoizedLoadWithErrorAnnotation=  (
  compartmentPrivateFields,
  moduleAliases,
  compartment,
  moduleSpecifier,
  enqueueJob,
  selectImplementation,
  moduleLoads)=>
     {
  const { name: compartmentName}=   weakmapGet(
    compartmentPrivateFields,
    compartment);


  // Prevent data-lock from recursion into branches visited in dependent loads.
  let compartmentLoading=  mapGet(moduleLoads, compartment);
  if( compartmentLoading===  undefined) {
    compartmentLoading=  new Map();
    mapSet(moduleLoads, compartment, compartmentLoading);
   }
  let moduleLoading=  mapGet(compartmentLoading, moduleSpecifier);
  if( moduleLoading!==  undefined) {
    return moduleLoading;
   }

  moduleLoading=  selectImplementation(asyncTrampoline, syncTrampoline)(
    loadWithoutErrorAnnotation,
    [
      compartmentPrivateFields,
      moduleAliases,
      compartment,
      moduleSpecifier,
      enqueueJob,
      selectImplementation,
      moduleLoads],

    (error)=>{
      // eslint-disable-next-line @endo/no-polymorphic-call
      assert.note(
        error,
        d `${error.message}, loading ${q(moduleSpecifier)} in compartment ${q(
          compartmentName)
          }`);

      throw error;
     });


  mapSet(compartmentLoading, moduleSpecifier, moduleLoading);

  return moduleLoading;
 };

function asyncJobQueue() {
  /** @type {Set<Promise<undefined>>} */
  const pendingJobs=  new Set();
  /** @type {Array<Error>} */
  const errors=  [];

  /**
   * Enqueues a job that starts immediately but won't be awaited until drainQueue is called.
   *
   * @template {any[]} T
   * @param {(...args: T)=>Promise<*>} func
   * @param {T} args
   */
  const enqueueJob=  (func, args)=>  {
    setAdd(
      pendingJobs,
      promiseThen(func(...args), noop, (error)=>{
        arrayPush(errors, error);
       }));

   };
  /**
   * Sequentially awaits pending jobs and returns an array of errors
   *
   * @returns {Promise<Array<Error>>}
   */
  const drainQueue=  async()=>   {
    for( const job of pendingJobs) {
      // eslint-disable-next-line no-await-in-loop
      await job;
     }
    return errors;
   };
  return { enqueueJob, drainQueue};
 }

/**
 * @param {object} options
 * @param {Array<Error>} options.errors
 * @param {string} options.errorPrefix
 */
function throwAggregateError({ errors, errorPrefix})  {
  // Throw an aggregate error if there were any errors.
  if( errors.length>  0) {
    const verbose=
      getenv('COMPARTMENT_LOAD_ERRORS', '', ['verbose'])===  'verbose';
    throw TypeError(
       `${errorPrefix} (${errors.length} underlying failures: ${arrayJoin(
        arrayMap(errors, (error)=>error.message+(  verbose?  error.stack:  '')),
        ', ')
        }`);

   }
 }

const preferSync=  (_asyncImpl, syncImpl)=>  syncImpl;
const preferAsync=  (asyncImpl, _syncImpl)=>  asyncImpl;

/*
 * `load` asynchronously gathers the `StaticModuleRecord`s for a module and its
 * transitive dependencies.
 * The module records refer to each other by a reference to the dependency's
 * compartment and the specifier of the module within its own compartment.
 * This graph is then ready to be synchronously linked and executed.
 */
const        load=  async(
  compartmentPrivateFields,
  moduleAliases,
  compartment,
  moduleSpecifier)=>
     {
  const { name: compartmentName}=   weakmapGet(
    compartmentPrivateFields,
    compartment);


  /** @type {Map<object, Map<string, Promise<Record<any, any>>>>} */
  const moduleLoads=  new Map();

  const { enqueueJob, drainQueue}=   asyncJobQueue();

  enqueueJob(memoizedLoadWithErrorAnnotation, [
    compartmentPrivateFields,
    moduleAliases,
    compartment,
    moduleSpecifier,
    enqueueJob,
    preferAsync,
    moduleLoads]);


  // Drain pending jobs queue and throw an aggregate error
  const errors=  await drainQueue();

  throwAggregateError({
    errors,
    errorPrefix:  `Failed to load module ${q(moduleSpecifier)} in package ${q(
      compartmentName)
      }`});

 };

/*
 * `loadNow` synchronously gathers the `StaticModuleRecord`s for a module and its
 * transitive dependencies.
 * The module records refer to each other by a reference to the dependency's
 * compartment and the specifier of the module within its own compartment.
 * This graph is then ready to be synchronously linked and executed.
 */$h‍_once.load(load);
const        loadNow=  (
  compartmentPrivateFields,
  moduleAliases,
  compartment,
  moduleSpecifier)=>
     {
  const { name: compartmentName}=   weakmapGet(
    compartmentPrivateFields,
    compartment);


  /** @type {Map<object, Map<string, Promise<Record<any, any>>>>} */
  const moduleLoads=  new Map();

  /** @type {Array<Error>} */
  const errors=  [];

  const enqueueJob=  (func, args)=>  {
    try {
      func(...args);
     }catch( error) {
      arrayPush(errors, error);
     }
   };

  enqueueJob(memoizedLoadWithErrorAnnotation, [
    compartmentPrivateFields,
    moduleAliases,
    compartment,
    moduleSpecifier,
    enqueueJob,
    preferSync,
    moduleLoads]);


  throwAggregateError({
    errors,
    errorPrefix:  `Failed to load module ${q(moduleSpecifier)} in package ${q(
      compartmentName)
      }`});

 };$h‍_once.loadNow(loadNow);
})()
,
// === functors[40] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let makeAlias,Proxy,TypeError,create,freeze,mapGet,mapHas,mapSet,ownKeys,reflectGet,reflectGetOwnPropertyDescriptor,reflectHas,reflectIsExtensible,reflectPreventExtensions,toStringTagSymbol,weakmapSet,assert;$h‍_imports([["./module-load.js", [["makeAlias", [$h‍_a => (makeAlias = $h‍_a)]]]],["./commons.js", [["Proxy", [$h‍_a => (Proxy = $h‍_a)]],["TypeError", [$h‍_a => (TypeError = $h‍_a)]],["create", [$h‍_a => (create = $h‍_a)]],["freeze", [$h‍_a => (freeze = $h‍_a)]],["mapGet", [$h‍_a => (mapGet = $h‍_a)]],["mapHas", [$h‍_a => (mapHas = $h‍_a)]],["mapSet", [$h‍_a => (mapSet = $h‍_a)]],["ownKeys", [$h‍_a => (ownKeys = $h‍_a)]],["reflectGet", [$h‍_a => (reflectGet = $h‍_a)]],["reflectGetOwnPropertyDescriptor", [$h‍_a => (reflectGetOwnPropertyDescriptor = $h‍_a)]],["reflectHas", [$h‍_a => (reflectHas = $h‍_a)]],["reflectIsExtensible", [$h‍_a => (reflectIsExtensible = $h‍_a)]],["reflectPreventExtensions", [$h‍_a => (reflectPreventExtensions = $h‍_a)]],["toStringTagSymbol", [$h‍_a => (toStringTagSymbol = $h‍_a)]],["weakmapSet", [$h‍_a => (weakmapSet = $h‍_a)]]]],["./error/assert.js", [["assert", [$h‍_a => (assert = $h‍_a)]]]]]);   































const { quote: q}=   assert;

// `deferExports` creates a module's exports proxy, proxied exports, and
// activator.
// A `Compartment` can create a module for any module specifier, regardless of
// whether it is loadable or executable, and use that object as a token that
// can be fed into another compartment's module map.
// Only after the specified module has been analyzed is it possible for the
// module namespace proxy to behave properly, so it throws exceptions until
// after the compartment has begun executing the module.
// The module instance must freeze the proxied exports and activate the exports
// proxy before executing the module.
//
// The module exports proxy's behavior differs from the ECMAScript 262
// specification for "module namespace exotic objects" only in that according
// to the specification value property descriptors have a non-writable "value"
// and this implementation models all properties with accessors.
//
// https://tc39.es/ecma262/#sec-module-namespace-exotic-objects
//
const        deferExports=  ()=>  {
  let active=  false;
  const exportsTarget=  create(null, {
    // Make this appear like an ESM module namespace object.
    [toStringTagSymbol]: {
      value: 'Module',
      writable: false,
      enumerable: false,
      configurable: false}});


  return freeze({
    activate() {
      active=  true;
     },
    exportsTarget,
    exportsProxy: new Proxy(exportsTarget, {
      get(_target, name, receiver) {
        if( !active) {
          throw TypeError(
             `Cannot get property ${q(
              name)
              } of module exports namespace, the module has not yet begun to execute`);

         }
        return reflectGet(exportsTarget, name, receiver);
       },
      set(_target, name, _value) {
        throw TypeError(
           `Cannot set property ${q(name)} of module exports namespace`);

       },
      has(_target, name) {
        if( !active) {
          throw TypeError(
             `Cannot check property ${q(
              name)
              }, the module has not yet begun to execute`);

         }
        return reflectHas(exportsTarget, name);
       },
      deleteProperty(_target, name) {
        throw TypeError(
           `Cannot delete property ${q(name)}s of module exports namespace`);

       },
      ownKeys(_target) {
        if( !active) {
          throw TypeError(
            'Cannot enumerate keys, the module has not yet begun to execute');

         }
        return ownKeys(exportsTarget);
       },
      getOwnPropertyDescriptor(_target, name) {
        if( !active) {
          throw TypeError(
             `Cannot get own property descriptor ${q(
              name)
              }, the module has not yet begun to execute`);

         }
        return reflectGetOwnPropertyDescriptor(exportsTarget, name);
       },
      preventExtensions(_target) {
        if( !active) {
          throw TypeError(
            'Cannot prevent extensions of module exports namespace, the module has not yet begun to execute');

         }
        return reflectPreventExtensions(exportsTarget);
       },
      isExtensible() {
        if( !active) {
          throw TypeError(
            'Cannot check extensibility of module exports namespace, the module has not yet begun to execute');

         }
        return reflectIsExtensible(exportsTarget);
       },
      getPrototypeOf(_target) {
        return null;
       },
      setPrototypeOf(_target, _proto) {
        throw TypeError('Cannot set prototype of module exports namespace');
       },
      defineProperty(_target, name, _descriptor) {
        throw TypeError(
           `Cannot define property ${q(name)} of module exports namespace`);

       },
      apply(_target, _thisArg, _args) {
        throw TypeError(
          'Cannot call module exports namespace, it is not a function');

       },
      construct(_target, _args) {
        throw TypeError(
          'Cannot construct module exports namespace, it is not a constructor');

       }})});


 };

/**
 * @typedef {object} DeferredExports
 * @property {Record<string, any>} exportsTarget - The object to which a
 * module's exports will be added.
 * @property {Record<string, any>} exportsProxy - A proxy over the `exportsTarget`,
 * used to expose its "exports" to other compartments.
 * @property {() => void} activate - Activate the `exportsProxy` such that it can
 * be used as a module namespace object.
 */

/**
 * Memoizes the creation of a deferred module exports namespace proxy for any
 * arbitrary full specifier in a compartment. It also records the compartment
 * and specifier affiliated with that module exports namespace proxy so it
 * can be used as an alias into another compartment when threaded through
 * a compartment's `moduleMap` argument.
 *
 * @param {*} compartment - The compartment to retrieve deferred exports from.
 * @param {*} compartmentPrivateFields - The private fields of the compartment.
 * @param {*} moduleAliases - The module aliases of the compartment.
 * @param {string} specifier - The module specifier to retrieve deferred exports for.
 * @returns {DeferredExports} - The deferred exports for the module specifier of
 * the compartment.
 */$h‍_once.deferExports(deferExports);
const        getDeferredExports=  (
  compartment,
  compartmentPrivateFields,
  moduleAliases,
  specifier)=>
     {
  const { deferredExports}=   compartmentPrivateFields;
  if( !mapHas(deferredExports, specifier)) {
    const deferred=  deferExports();
    weakmapSet(
      moduleAliases,
      deferred.exportsProxy,
      makeAlias(compartment, specifier));

    mapSet(deferredExports, specifier, deferred);
   }
  return mapGet(deferredExports, specifier);
 };$h‍_once.getDeferredExports(getDeferredExports);
})()
,
// === functors[41] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let TypeError,arrayPush,create,getOwnPropertyDescriptors,evadeHtmlCommentTest,evadeImportExpressionTest,rejectSomeDirectEvalExpressions,makeSafeEvaluator;$h‍_imports([["./commons.js", [["TypeError", [$h‍_a => (TypeError = $h‍_a)]],["arrayPush", [$h‍_a => (arrayPush = $h‍_a)]],["create", [$h‍_a => (create = $h‍_a)]],["getOwnPropertyDescriptors", [$h‍_a => (getOwnPropertyDescriptors = $h‍_a)]]]],["./transforms.js", [["evadeHtmlCommentTest", [$h‍_a => (evadeHtmlCommentTest = $h‍_a)]],["evadeImportExpressionTest", [$h‍_a => (evadeImportExpressionTest = $h‍_a)]],["rejectSomeDirectEvalExpressions", [$h‍_a => (rejectSomeDirectEvalExpressions = $h‍_a)]]]],["./make-safe-evaluator.js", [["makeSafeEvaluator", [$h‍_a => (makeSafeEvaluator = $h‍_a)]]]]]);   













const        provideCompartmentEvaluator=  (compartmentFields, options)=>  {
  const { sloppyGlobalsMode=  false, __moduleShimLexicals__=  undefined}=
    options;

  let safeEvaluate;

  if( __moduleShimLexicals__===  undefined&&  !sloppyGlobalsMode) {
    ({ safeEvaluate}=   compartmentFields);
   }else {
    // The scope proxy or global lexicals are different from the
    // shared evaluator so we need to build a new one

    let { globalTransforms}=   compartmentFields;
    const { globalObject}=   compartmentFields;

    let moduleLexicals;
    if( __moduleShimLexicals__!==  undefined) {
      // When using `evaluate` for ESM modules, as should only occur from the
      // module-shim's module-instance.js, we do not reveal the SES-shim's
      // module-to-program translation, as this is not standardizable behavior.
      // However, the `localTransforms` will come from the `__shimTransforms__`
      // Compartment option in this case, which is a non-standardizable escape
      // hatch so programs designed specifically for the SES-shim
      // implementation may opt-in to use the same transforms for `evaluate`
      // and `import`, at the expense of being tightly coupled to SES-shim.
      globalTransforms=  undefined;

      moduleLexicals=  create(
        null,
        getOwnPropertyDescriptors(__moduleShimLexicals__));

     }

    ({ safeEvaluate}=   makeSafeEvaluator({
      globalObject,
      moduleLexicals,
      globalTransforms,
      sloppyGlobalsMode}));

   }

  return { safeEvaluate};
 };$h‍_once.provideCompartmentEvaluator(provideCompartmentEvaluator);

const        compartmentEvaluate=  (compartmentFields, source, options)=>  {
  // Perform this check first to avoid unnecessary sanitizing.
  // TODO Maybe relax string check and coerce instead:
  // https://github.com/tc39/proposal-dynamic-code-brand-checks
  if( typeof source!==  'string') {
    throw TypeError('first argument of evaluate() must be a string');
   }

  // Extract options, and shallow-clone transforms.
  const {
    transforms=  [],
    __evadeHtmlCommentTest__=  false,
    __evadeImportExpressionTest__=  false,
    __rejectSomeDirectEvalExpressions__=  true  // Note default on
}=    options;
  const localTransforms=  [...transforms];
  if( __evadeHtmlCommentTest__===  true) {
    arrayPush(localTransforms, evadeHtmlCommentTest);
   }
  if( __evadeImportExpressionTest__===  true) {
    arrayPush(localTransforms, evadeImportExpressionTest);
   }
  if( __rejectSomeDirectEvalExpressions__===  true) {
    arrayPush(localTransforms, rejectSomeDirectEvalExpressions);
   }

  const { safeEvaluate}=   provideCompartmentEvaluator(
    compartmentFields,
    options);


  return safeEvaluate(source, {
    localTransforms});

 };$h‍_once.compartmentEvaluate(compartmentEvaluate);
})()
,
// === functors[42] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let assert,getDeferredExports,ReferenceError,SyntaxError,TypeError,arrayForEach,arrayIncludes,arrayPush,arraySome,arraySort,create,defineProperty,entries,freeze,isArray,keys,mapGet,weakmapGet,reflectHas,assign,compartmentEvaluate;$h‍_imports([["./error/assert.js", [["assert", [$h‍_a => (assert = $h‍_a)]]]],["./module-proxy.js", [["getDeferredExports", [$h‍_a => (getDeferredExports = $h‍_a)]]]],["./commons.js", [["ReferenceError", [$h‍_a => (ReferenceError = $h‍_a)]],["SyntaxError", [$h‍_a => (SyntaxError = $h‍_a)]],["TypeError", [$h‍_a => (TypeError = $h‍_a)]],["arrayForEach", [$h‍_a => (arrayForEach = $h‍_a)]],["arrayIncludes", [$h‍_a => (arrayIncludes = $h‍_a)]],["arrayPush", [$h‍_a => (arrayPush = $h‍_a)]],["arraySome", [$h‍_a => (arraySome = $h‍_a)]],["arraySort", [$h‍_a => (arraySort = $h‍_a)]],["create", [$h‍_a => (create = $h‍_a)]],["defineProperty", [$h‍_a => (defineProperty = $h‍_a)]],["entries", [$h‍_a => (entries = $h‍_a)]],["freeze", [$h‍_a => (freeze = $h‍_a)]],["isArray", [$h‍_a => (isArray = $h‍_a)]],["keys", [$h‍_a => (keys = $h‍_a)]],["mapGet", [$h‍_a => (mapGet = $h‍_a)]],["weakmapGet", [$h‍_a => (weakmapGet = $h‍_a)]],["reflectHas", [$h‍_a => (reflectHas = $h‍_a)]],["assign", [$h‍_a => (assign = $h‍_a)]]]],["./compartment-evaluate.js", [["compartmentEvaluate", [$h‍_a => (compartmentEvaluate = $h‍_a)]]]]]);   























const { quote: q}=   assert;

const        makeThirdPartyModuleInstance=  (
  compartmentPrivateFields,
  staticModuleRecord,
  compartment,
  moduleAliases,
  moduleSpecifier,
  resolvedImports)=>
     {
  const { exportsProxy, exportsTarget, activate}=   getDeferredExports(
    compartment,
    weakmapGet(compartmentPrivateFields, compartment),
    moduleAliases,
    moduleSpecifier);


  const notifiers=  create(null);

  if( staticModuleRecord.exports) {
    if(
      !isArray(staticModuleRecord.exports)||
      arraySome(staticModuleRecord.exports, (name)=>typeof name!==  'string'))
      {
      throw TypeError(
         `SES third-party static module record "exports" property must be an array of strings for module ${moduleSpecifier}`);

     }
    arrayForEach(staticModuleRecord.exports, (name)=>{
      let value=  exportsTarget[name];
      const updaters=  [];

      const get=  ()=>  value;

      const set=  (newValue)=>{
        value=  newValue;
        for( const updater of updaters) {
          updater(newValue);
         }
       };

      defineProperty(exportsTarget, name, {
        get,
        set,
        enumerable: true,
        configurable: false});


      notifiers[name]=  (update)=>{
        arrayPush(updaters, update);
        update(value);
       };
     });
    // This is enough to support import * from cjs - the '*' field doesn't need to be in exports nor exportsTarget because import will only ever access it via notifiers
    notifiers['*']=  (update)=>{
      update(exportsTarget);
     };
   }

  const localState=  {
    activated: false};

  return freeze({
    notifiers,
    exportsProxy,
    execute() {
      if( reflectHas(localState, 'errorFromExecute')) {
        throw localState.errorFromExecute;
       }
      if( !localState.activated) {
        activate();
        localState.activated=  true;
        try {
          // eslint-disable-next-line @endo/no-polymorphic-call
          staticModuleRecord.execute(
            exportsTarget,
            compartment,
            resolvedImports);

         }catch( err) {
          localState.errorFromExecute=  err;
          throw err;
         }
       }
     }});

 };

// `makeModuleInstance` takes a module's compartment record, the live import
// namespace, and a global object; and produces a module instance.
// The module instance carries the proxied module exports namespace (the
// "exports"), notifiers to update the module's internal import namespace, and
// an idempotent execute function.
// The module exports namespace is a proxy to the proxied exports namespace
// that the execution of the module instance populates.
$h‍_once.makeThirdPartyModuleInstance(makeThirdPartyModuleInstance);const makeModuleInstance=(
  privateFields,
  moduleAliases,
  moduleRecord,
  importedInstances)=>
     {
  const {
    compartment,
    moduleSpecifier,
    staticModuleRecord,
    importMeta: moduleRecordMeta}=
      moduleRecord;
  const {
    reexports: exportAlls=  [],
    __syncModuleProgram__: functorSource,
    __fixedExportMap__: fixedExportMap=  {},
    __liveExportMap__: liveExportMap=  {},
    __reexportMap__: reexportMap=  {},
    __needsImportMeta__: needsImportMeta=  false,
    __syncModuleFunctor__}=
      staticModuleRecord;

  const compartmentFields=  weakmapGet(privateFields, compartment);

  const { __shimTransforms__, importMetaHook}=   compartmentFields;

  const { exportsProxy, exportsTarget, activate}=   getDeferredExports(
    compartment,
    compartmentFields,
    moduleAliases,
    moduleSpecifier);


  // {_exportName_: getter} module exports namespace
  // object (eventually proxied).
  const exportsProps=  create(null);

  // {_localName_: accessor} proxy traps for moduleLexicals and live bindings.
  // The moduleLexicals object is frozen and the corresponding properties of
  // moduleLexicals must be immutable, so we copy the descriptors.
  const moduleLexicals=  create(null);

  // {_localName_: init(initValue) -> initValue} used by the
  // rewritten code to initialize exported fixed bindings.
  const onceVar=  create(null);

  // {_localName_: update(newValue)} used by the rewritten code to
  // both initialize and update live bindings.
  const liveVar=  create(null);

  const importMeta=  create(null);
  if( moduleRecordMeta) {
    assign(importMeta, moduleRecordMeta);
   }
  if( needsImportMeta&&  importMetaHook) {
    importMetaHook(moduleSpecifier, importMeta);
   }

  // {_localName_: [{get, set, notify}]} used to merge all the export updaters.
  const localGetNotify=  create(null);

  // {[importName: string]: notify(update(newValue))} Used by code that imports
  // one of this module's exports, so that their update function will
  // be notified when this binding is initialized or updated.
  const notifiers=  create(null);

  arrayForEach(entries(fixedExportMap), ([fixedExportName, [localName]])=>  {
    let fixedGetNotify=  localGetNotify[localName];
    if( !fixedGetNotify) {
      // fixed binding state
      let value;
      let tdz=  true;
      /** @type {null | Array<(value: any) => void>} */
      let optUpdaters=  [];

      // tdz sensitive getter
      const get=  ()=>  {
        if( tdz) {
          throw ReferenceError( `binding ${q(localName)} not yet initialized`);
         }
        return value;
       };

      // leave tdz once
      const init=  freeze((initValue)=>{
        // init with initValue of a declared const binding, and return
        // it.
        if( !tdz) {
          throw TypeError(
             `Internal: binding ${q(localName)} already initialized`);

         }
        value=  initValue;
        const updaters=  optUpdaters;
        optUpdaters=  null;
        tdz=  false;
        for( const updater of updaters||  []) {
          updater(initValue);
         }
        return initValue;
       });

      // If still tdz, register update for notification later.
      // Otherwise, update now.
      const notify=  (updater)=>{
        if( updater===  init) {
          // Prevent recursion.
          return;
         }
        if( tdz) {
          arrayPush(optUpdaters||  [], updater);
         }else {
          updater(value);
         }
       };

      // Need these for additional exports of the local variable.
      fixedGetNotify=  {
        get,
        notify};

      localGetNotify[localName]=  fixedGetNotify;
      onceVar[localName]=  init;
     }

    exportsProps[fixedExportName]=  {
      get: fixedGetNotify.get,
      set: undefined,
      enumerable: true,
      configurable: false};


    notifiers[fixedExportName]=  fixedGetNotify.notify;
   });

  arrayForEach(
    entries(liveExportMap),
    ([liveExportName, [localName, setProxyTrap]])=>  {
      let liveGetNotify=  localGetNotify[localName];
      if( !liveGetNotify) {
        // live binding state
        let value;
        let tdz=  true;
        const updaters=  [];

        // tdz sensitive getter
        const get=  ()=>  {
          if( tdz) {
            throw ReferenceError(
               `binding ${q(liveExportName)} not yet initialized`);

           }
          return value;
         };

        // This must be usable locally for the translation of initializing
        // a declared local live binding variable.
        //
        // For reexported variable, this is also an update function to
        // register for notification with the downstream import, which we
        // must assume to be live. Thus, it can be called independent of
        // tdz but always leaves tdz. Such reexporting creates a tree of
        // bindings. This lets the tree be hooked up even if the imported
        // module instance isn't initialized yet, as may happen in cycles.
        const update=  freeze((newValue)=>{
          value=  newValue;
          tdz=  false;
          for( const updater of updaters) {
            updater(newValue);
           }
         });

        // tdz sensitive setter
        const set=  (newValue)=>{
          if( tdz) {
            throw ReferenceError( `binding ${q(localName)} not yet initialized`);
           }
          value=  newValue;
          for( const updater of updaters) {
            updater(newValue);
           }
         };

        // Always register the updater function.
        // If not in tdz, also update now.
        const notify=  (updater)=>{
          if( updater===  update) {
            // Prevent recursion.
            return;
           }
          arrayPush(updaters, updater);
          if( !tdz) {
            updater(value);
           }
         };

        liveGetNotify=  {
          get,
          notify};


        localGetNotify[localName]=  liveGetNotify;
        if( setProxyTrap) {
          defineProperty(moduleLexicals, localName, {
            get,
            set,
            enumerable: true,
            configurable: false});

         }
        liveVar[localName]=  update;
       }

      exportsProps[liveExportName]=  {
        get: liveGetNotify.get,
        set: undefined,
        enumerable: true,
        configurable: false};


      notifiers[liveExportName]=  liveGetNotify.notify;
     });


  const notifyStar=  (update)=>{
    update(exportsTarget);
   };
  notifiers['*']=  notifyStar;

  // Per the calling convention for the moduleFunctor generated from
  // an ESM, the `imports` function gets called once up front
  // to populate or arrange the population of imports and reexports.
  // The generated code produces an `updateRecord`: the means for
  // the linker to update the imports and exports of the module.
  // The updateRecord must conform to moduleAnalysis.imports
  // updateRecord = Map<specifier, importUpdaters>
  // importUpdaters = Map<importName, [update(newValue)*]>
  function imports(updateRecord) {
    // By the time imports is called, the importedInstances should already be
    // initialized with module instances that satisfy
    // imports.
    // importedInstances = Map[_specifier_, { notifiers, module, execute }]
    // notifiers = { [importName: string]: notify(update(newValue))}

    // export * cannot export default.
    const candidateAll=  create(null);
    candidateAll.default=  false;
    for( const [specifier, importUpdaters]of  updateRecord) {
      const instance=  mapGet(importedInstances, specifier);
      // The module instance object is an internal literal, does not bind this,
      // and never revealed outside the SES shim.
      // There are two instantiation sites for instances and they are both in
      // this module.
      // eslint-disable-next-line @endo/no-polymorphic-call
      instance.execute(); // bottom up cycle tolerant
      const { notifiers: importNotifiers}=   instance;
      for( const [importName, updaters]of  importUpdaters) {
        const importNotify=  importNotifiers[importName];
        if( !importNotify) {
          throw SyntaxError(
             `The requested module '${specifier}' does not provide an export named '${importName}'`);

         }
        for( const updater of updaters) {
          importNotify(updater);
         }
       }
      if( arrayIncludes(exportAlls, specifier)) {
        // Make all these imports candidates.
        // Note names don't change in reexporting all
        for( const [importAndExportName, importNotify]of  entries(
          importNotifiers))
           {
          if( candidateAll[importAndExportName]===  undefined) {
            candidateAll[importAndExportName]=  importNotify;
           }else {
            // Already a candidate: remove ambiguity.
            candidateAll[importAndExportName]=  false;
           }
         }
       }
      if( reexportMap[specifier]) {
        // Make named reexports candidates too.
        for( const [localName, exportedName]of  reexportMap[specifier]) {
          candidateAll[exportedName]=  importNotifiers[localName];
         }
       }
     }

    for( const [exportName, notify]of  entries(candidateAll)) {
      if( !notifiers[exportName]&&  notify!==  false) {
        notifiers[exportName]=  notify;

        // exported live binding state
        let value;
        const update=  (newValue)=> value=  newValue;
        notify(update);
        exportsProps[exportName]=  {
          get() {
            return value;
           },
          set: undefined,
          enumerable: true,
          configurable: false};

       }
     }

    // Sort the module exports namespace as per spec.
    // The module exports namespace will be wrapped in a module namespace
    // exports proxy which will serve as a "module exports namespace exotic
    // object".
    // Sorting properties is not generally reliable because some properties may
    // be symbols, and symbols do not have an inherent relative order, but
    // since all properties of the exports namespace must be keyed by a string
    // and the string must correspond to a valid identifier, sorting these
    // properties works for this specific case.
    arrayForEach(arraySort(keys(exportsProps)), (k)=>
      defineProperty(exportsTarget, k, exportsProps[k]));


    freeze(exportsTarget);
    activate();
   }

  let optFunctor;
  if( __syncModuleFunctor__!==  undefined) {
    optFunctor=  __syncModuleFunctor__;
   }else {
    optFunctor=  compartmentEvaluate(compartmentFields, functorSource, {
      globalObject: compartment.globalThis,
      transforms: __shimTransforms__,
      __moduleShimLexicals__: moduleLexicals});

   }
  let didThrow=  false;
  let thrownError;
  function execute() {
    if( optFunctor) {
      // uninitialized
      const functor=  optFunctor;
      optFunctor=  null;
      // initializing - call with `this` of `undefined`.
      try {
        functor(
          freeze({
            imports: freeze(imports),
            onceVar: freeze(onceVar),
            liveVar: freeze(liveVar),
            importMeta}));


       }catch( e) {
        didThrow=  true;
        thrownError=  e;
       }
      // initialized
     }
    if( didThrow) {
      throw thrownError;
     }
   }

  return freeze({
    notifiers,
    exportsProxy,
    execute});

 };$h‍_once.makeModuleInstance(makeModuleInstance);
})()
,
// === functors[43] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let assert,makeModuleInstance,makeThirdPartyModuleInstance,Map,ReferenceError,TypeError,entries,isArray,isObject,mapGet,mapHas,mapSet,weakmapGet;$h‍_imports([["./error/assert.js", [["assert", [$h‍_a => (assert = $h‍_a)]]]],["./module-instance.js", [["makeModuleInstance", [$h‍_a => (makeModuleInstance = $h‍_a)]],["makeThirdPartyModuleInstance", [$h‍_a => (makeThirdPartyModuleInstance = $h‍_a)]]]],["./commons.js", [["Map", [$h‍_a => (Map = $h‍_a)]],["ReferenceError", [$h‍_a => (ReferenceError = $h‍_a)]],["TypeError", [$h‍_a => (TypeError = $h‍_a)]],["entries", [$h‍_a => (entries = $h‍_a)]],["isArray", [$h‍_a => (isArray = $h‍_a)]],["isObject", [$h‍_a => (isObject = $h‍_a)]],["mapGet", [$h‍_a => (mapGet = $h‍_a)]],["mapHas", [$h‍_a => (mapHas = $h‍_a)]],["mapSet", [$h‍_a => (mapSet = $h‍_a)]],["weakmapGet", [$h‍_a => (weakmapGet = $h‍_a)]]]]]);   



























const { Fail, quote: q}=   assert;

// `link` creates `ModuleInstances` and `ModuleNamespaces` for a module and its
// transitive dependencies and connects their imports and exports.
// After linking, the resulting working set is ready to be executed.
// The linker only concerns itself with module namespaces that are objects with
// property descriptors for their exports, which the Compartment proxies with
// the actual `ModuleNamespace`.
const        link=  (
  compartmentPrivateFields,
  moduleAliases,
  compartment,
  moduleSpecifier)=>
     {
  const { name: compartmentName, moduleRecords}=   weakmapGet(
    compartmentPrivateFields,
    compartment);


  const moduleRecord=  mapGet(moduleRecords, moduleSpecifier);
  if( moduleRecord===  undefined) {
    throw ReferenceError(
       `Missing link to module ${q(moduleSpecifier)} from compartment ${q(
        compartmentName)
        }`);

   }

  // Mutual recursion so there's no confusion about which
  // compartment is in context: the module record may be in another
  // compartment, denoted by moduleRecord.compartment.
  // eslint-disable-next-line no-use-before-define
  return instantiate(compartmentPrivateFields, moduleAliases, moduleRecord);
 };$h‍_once.link(link);

function isPrecompiled(staticModuleRecord) {
  return typeof staticModuleRecord.__syncModuleProgram__===  'string';
 }

function validatePrecompiledStaticModuleRecord(
  staticModuleRecord,
  moduleSpecifier)
  {
  const { __fixedExportMap__, __liveExportMap__}=   staticModuleRecord;
  isObject(__fixedExportMap__)||
    Fail `Property '__fixedExportMap__' of a precompiled module record must be an object, got ${q(
      __fixedExportMap__)
      }, for module ${q(moduleSpecifier)}`;
  isObject(__liveExportMap__)||
    Fail `Property '__liveExportMap__' of a precompiled module record must be an object, got ${q(
      __liveExportMap__)
      }, for module ${q(moduleSpecifier)}`;
 }

function isThirdParty(staticModuleRecord) {
  return typeof staticModuleRecord.execute===  'function';
 }

function validateThirdPartyStaticModuleRecord(
  staticModuleRecord,
  moduleSpecifier)
  {
  const { exports}=   staticModuleRecord;
  isArray(exports)||
    Fail `Property 'exports' of a third-party static module record must be an array, got ${q(
      exports)
      }, for module ${q(moduleSpecifier)}`;
 }

function validateStaticModuleRecord(staticModuleRecord, moduleSpecifier) {
  isObject(staticModuleRecord)||
    Fail `Static module records must be of type object, got ${q(
      staticModuleRecord)
      }, for module ${q(moduleSpecifier)}`;
  const { imports, exports, reexports=  []}=   staticModuleRecord;
  isArray(imports)||
    Fail `Property 'imports' of a static module record must be an array, got ${q(
      imports)
      }, for module ${q(moduleSpecifier)}`;
  isArray(exports)||
    Fail `Property 'exports' of a precompiled module record must be an array, got ${q(
      exports)
      }, for module ${q(moduleSpecifier)}`;
  isArray(reexports)||
    Fail `Property 'reexports' of a precompiled module record must be an array if present, got ${q(
      reexports)
      }, for module ${q(moduleSpecifier)}`;
 }

const        instantiate=  (
  compartmentPrivateFields,
  moduleAliases,
  moduleRecord)=>
     {
  const { compartment, moduleSpecifier, resolvedImports, staticModuleRecord}=
    moduleRecord;
  const { instances}=   weakmapGet(compartmentPrivateFields, compartment);

  // Memoize.
  if( mapHas(instances, moduleSpecifier)) {
    return mapGet(instances, moduleSpecifier);
   }

  validateStaticModuleRecord(staticModuleRecord, moduleSpecifier);

  const importedInstances=  new Map();
  let moduleInstance;
  if( isPrecompiled(staticModuleRecord)) {
    validatePrecompiledStaticModuleRecord(staticModuleRecord, moduleSpecifier);
    moduleInstance=  makeModuleInstance(
      compartmentPrivateFields,
      moduleAliases,
      moduleRecord,
      importedInstances);

   }else if( isThirdParty(staticModuleRecord)) {
    validateThirdPartyStaticModuleRecord(staticModuleRecord, moduleSpecifier);
    moduleInstance=  makeThirdPartyModuleInstance(
      compartmentPrivateFields,
      staticModuleRecord,
      compartment,
      moduleAliases,
      moduleSpecifier,
      resolvedImports);

   }else {
    throw TypeError(
       `importHook must return a static module record, got ${q(
        staticModuleRecord)
        }`);

   }

  // Memoize.
  mapSet(instances, moduleSpecifier, moduleInstance);

  // Link dependency modules.
  for( const [importSpecifier, resolvedSpecifier]of  entries(resolvedImports)) {
    const importedInstance=  link(
      compartmentPrivateFields,
      moduleAliases,
      compartment,
      resolvedSpecifier);

    mapSet(importedInstances, importSpecifier, importedInstance);
   }

  return moduleInstance;
 };$h‍_once.instantiate(instantiate);
})()
,
// === functors[44] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let Map,ReferenceError,TypeError,WeakMap,assign,defineProperties,entries,promiseThen,toStringTagSymbol,weakmapGet,weakmapSet,setGlobalObjectSymbolUnscopables,setGlobalObjectConstantProperties,setGlobalObjectMutableProperties,setGlobalObjectEvaluators,sharedGlobalPropertyNames,load,loadNow,link,getDeferredExports,assert,compartmentEvaluate,makeSafeEvaluator;$h‍_imports([["./commons.js", [["Map", [$h‍_a => (Map = $h‍_a)]],["ReferenceError", [$h‍_a => (ReferenceError = $h‍_a)]],["TypeError", [$h‍_a => (TypeError = $h‍_a)]],["WeakMap", [$h‍_a => (WeakMap = $h‍_a)]],["assign", [$h‍_a => (assign = $h‍_a)]],["defineProperties", [$h‍_a => (defineProperties = $h‍_a)]],["entries", [$h‍_a => (entries = $h‍_a)]],["promiseThen", [$h‍_a => (promiseThen = $h‍_a)]],["toStringTagSymbol", [$h‍_a => (toStringTagSymbol = $h‍_a)]],["weakmapGet", [$h‍_a => (weakmapGet = $h‍_a)]],["weakmapSet", [$h‍_a => (weakmapSet = $h‍_a)]]]],["./global-object.js", [["setGlobalObjectSymbolUnscopables", [$h‍_a => (setGlobalObjectSymbolUnscopables = $h‍_a)]],["setGlobalObjectConstantProperties", [$h‍_a => (setGlobalObjectConstantProperties = $h‍_a)]],["setGlobalObjectMutableProperties", [$h‍_a => (setGlobalObjectMutableProperties = $h‍_a)]],["setGlobalObjectEvaluators", [$h‍_a => (setGlobalObjectEvaluators = $h‍_a)]]]],["./permits.js", [["sharedGlobalPropertyNames", [$h‍_a => (sharedGlobalPropertyNames = $h‍_a)]]]],["./module-load.js", [["load", [$h‍_a => (load = $h‍_a)]],["loadNow", [$h‍_a => (loadNow = $h‍_a)]]]],["./module-link.js", [["link", [$h‍_a => (link = $h‍_a)]]]],["./module-proxy.js", [["getDeferredExports", [$h‍_a => (getDeferredExports = $h‍_a)]]]],["./error/assert.js", [["assert", [$h‍_a => (assert = $h‍_a)]]]],["./compartment-evaluate.js", [["compartmentEvaluate", [$h‍_a => (compartmentEvaluate = $h‍_a)]]]],["./make-safe-evaluator.js", [["makeSafeEvaluator", [$h‍_a => (makeSafeEvaluator = $h‍_a)]]]]]);   






























const { quote: q}=   assert;

// moduleAliases associates every public module exports namespace with its
// corresponding compartment and specifier so they can be used to link modules
// across compartments.
// The mechanism to thread an alias is to use the compartment.module function
// to obtain the exports namespace of a foreign module and pass it into another
// compartment's moduleMap constructor option.
const moduleAliases=  new WeakMap();

// privateFields captures the private state for each compartment.
const privateFields=  new WeakMap();

// Compartments do not need an importHook or resolveHook to be useful
// as a vessel for evaluating programs.
// However, any method that operates the module system will throw an exception
// if these hooks are not available.
const assertModuleHooks=  (compartment)=>{
  const { importHook, resolveHook}=   weakmapGet(privateFields, compartment);
  if( typeof importHook!==  'function'||  typeof resolveHook!==  'function') {
    throw TypeError(
      'Compartment must be constructed with an importHook and a resolveHook for it to be able to load modules');

   }
 };

const        InertCompartment=  function Compartment(
  _endowments=  {},
  _modules=  {},
  _options=  {})
  {
  throw TypeError(
    'Compartment.prototype.constructor is not a valid constructor.');

 };

/**
 * @param {Compartment} compartment
 * @param {string} specifier
 */$h‍_once.InertCompartment(InertCompartment);
const compartmentImportNow=  (compartment, specifier)=>  {
  const { execute, exportsProxy}=   link(
    privateFields,
    moduleAliases,
    compartment,
    specifier);

  execute();
  return exportsProxy;
 };

const        CompartmentPrototype=  {
  constructor: InertCompartment,

  get globalThis() {
    return weakmapGet(privateFields, this).globalObject;
   },

  get name() {
    return weakmapGet(privateFields, this).name;
   },

  /**
   * @param {string} source is a JavaScript program grammar construction.
   * @param {object} [options]
   * @param {Array<import('./lockdown-shim').Transform>} [options.transforms]
   * @param {boolean} [options.sloppyGlobalsMode]
   * @param {object} [options.__moduleShimLexicals__]
   * @param {boolean} [options.__evadeHtmlCommentTest__]
   * @param {boolean} [options.__evadeImportExpressionTest__]
   * @param {boolean} [options.__rejectSomeDirectEvalExpressions__]
   */
  evaluate(source, options=  {}) {
    const compartmentFields=  weakmapGet(privateFields, this);
    return compartmentEvaluate(compartmentFields, source, options);
   },

  module(specifier) {
    if( typeof specifier!==  'string') {
      throw TypeError('first argument of module() must be a string');
     }

    assertModuleHooks(this);

    const { exportsProxy}=   getDeferredExports(
      this,
      weakmapGet(privateFields, this),
      moduleAliases,
      specifier);


    return exportsProxy;
   },

        async import(specifier){
    if( typeof specifier!==  'string') {
      throw TypeError('first argument of import() must be a string');
     }

    assertModuleHooks(this);

    return promiseThen(
      load(privateFields, moduleAliases, this, specifier),
      ()=>  {
        // The namespace box is a contentious design and likely to be a breaking
        // change in an appropriately numbered future version.
        const namespace=  compartmentImportNow(
          /** @type {Compartment} */  this,
          specifier);

        return { namespace};
       });

   },

        async load(specifier){
    if( typeof specifier!==  'string') {
      throw TypeError('first argument of load() must be a string');
     }

    assertModuleHooks(this);

    return load(privateFields, moduleAliases, this, specifier);
   },

  importNow(specifier) {
    if( typeof specifier!==  'string') {
      throw TypeError('first argument of importNow() must be a string');
     }

    assertModuleHooks(this);
    loadNow(privateFields, moduleAliases, this, specifier);
    return compartmentImportNow(/** @type {Compartment} */  this,  specifier);
   }};


// This causes `String(new Compartment())` to evaluate to `[object Compartment]`.
// The descriptor follows the conventions of other globals with @@toStringTag
// properties, e.g. Math.
$h‍_once.CompartmentPrototype(CompartmentPrototype);defineProperties(CompartmentPrototype,{
  [toStringTagSymbol]: {
    value: 'Compartment',
    writable: false,
    enumerable: false,
    configurable: true}});



defineProperties(InertCompartment, {
  prototype: { value: CompartmentPrototype}});


/**
 * @callback MakeCompartmentConstructor
 * @param {MakeCompartmentConstructor} targetMakeCompartmentConstructor
 * @param {Record<string, any>} intrinsics
 * @param {(object: object) => void} markVirtualizedNativeFunction
 * @returns {Compartment['constructor']}
 */

/** @type {MakeCompartmentConstructor} */
const        makeCompartmentConstructor=  (
  targetMakeCompartmentConstructor,
  intrinsics,
  markVirtualizedNativeFunction)=>
     {
  function Compartment(endowments=  {}, moduleMap=  {}, options=  {}) {
    if( new.target===  undefined) {
      throw TypeError(
        "Class constructor Compartment cannot be invoked without 'new'");

     }

    // Extract options, and shallow-clone transforms.
    const {
      name=  '<unknown>',
      transforms=  [],
      __shimTransforms__=  [],
      resolveHook,
      importHook,
      importNowHook,
      moduleMapHook,
      importMetaHook}=
        options;
    const globalTransforms=  [...transforms, ...__shimTransforms__];

    // Map<FullSpecifier, ModuleCompartmentRecord>
    const moduleRecords=  new Map();
    // Map<FullSpecifier, ModuleInstance>
    const instances=  new Map();
    // Map<FullSpecifier, {ExportsProxy, ProxiedExports, activate()}>
    const deferredExports=  new Map();

    // Validate given moduleMap.
    // The module map gets translated on-demand in module-load.js and the
    // moduleMap can be invalid in ways that cannot be detected in the
    // constructor, but these checks allow us to throw early for a better
    // developer experience.
    for( const [specifier, aliasNamespace]of  entries(moduleMap||  {})) {
      if( typeof aliasNamespace===  'string') {
        // TODO implement parent module record retrieval.
        throw TypeError(
           `Cannot map module ${q(specifier)} to ${q(
            aliasNamespace)
            } in parent compartment`);

       }else if( weakmapGet(moduleAliases, aliasNamespace)===  undefined) {
        // TODO create and link a synthetic module instance from the given
        // namespace object.
        throw ReferenceError(
           `Cannot map module ${q(
            specifier)
            } because it has no known compartment in this realm`);

       }
     }

    const globalObject=  {};

    setGlobalObjectSymbolUnscopables(globalObject);

    // We must initialize all constant properties first because
    // `makeSafeEvaluator` may use them to create optimized bindings
    // in the evaluator.
    // TODO: consider merging into a single initialization if internal
    // evaluator is no longer eagerly created
    setGlobalObjectConstantProperties(globalObject);

    const { safeEvaluate}=   makeSafeEvaluator({
      globalObject,
      globalTransforms,
      sloppyGlobalsMode: false});


    setGlobalObjectMutableProperties(globalObject, {
      intrinsics,
      newGlobalPropertyNames: sharedGlobalPropertyNames,
      makeCompartmentConstructor: targetMakeCompartmentConstructor,
      markVirtualizedNativeFunction});


    // TODO: maybe add evalTaming to the Compartment constructor 3rd options?
    setGlobalObjectEvaluators(
      globalObject,
      safeEvaluate,
      markVirtualizedNativeFunction);


    assign(globalObject, endowments);

    weakmapSet(privateFields, this, {
      name:  `${name}`,
      globalTransforms,
      globalObject,
      safeEvaluate,
      resolveHook,
      importHook,
      importNowHook,
      moduleMap,
      moduleMapHook,
      importMetaHook,
      moduleRecords,
      __shimTransforms__,
      deferredExports,
      instances});

   }

  Compartment.prototype=  CompartmentPrototype;

  return Compartment;
 };$h‍_once.makeCompartmentConstructor(makeCompartmentConstructor);
})()
,
// === functors[45] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let FERAL_FUNCTION,Float32Array,Map,Set,String,getOwnPropertyDescriptor,getPrototypeOf,iterateArray,iterateMap,iterateSet,iterateString,matchAllRegExp,matchAllSymbol,regexpPrototype,globalThis,InertCompartment;$h‍_imports([["./commons.js", [["FERAL_FUNCTION", [$h‍_a => (FERAL_FUNCTION = $h‍_a)]],["Float32Array", [$h‍_a => (Float32Array = $h‍_a)]],["Map", [$h‍_a => (Map = $h‍_a)]],["Set", [$h‍_a => (Set = $h‍_a)]],["String", [$h‍_a => (String = $h‍_a)]],["getOwnPropertyDescriptor", [$h‍_a => (getOwnPropertyDescriptor = $h‍_a)]],["getPrototypeOf", [$h‍_a => (getPrototypeOf = $h‍_a)]],["iterateArray", [$h‍_a => (iterateArray = $h‍_a)]],["iterateMap", [$h‍_a => (iterateMap = $h‍_a)]],["iterateSet", [$h‍_a => (iterateSet = $h‍_a)]],["iterateString", [$h‍_a => (iterateString = $h‍_a)]],["matchAllRegExp", [$h‍_a => (matchAllRegExp = $h‍_a)]],["matchAllSymbol", [$h‍_a => (matchAllSymbol = $h‍_a)]],["regexpPrototype", [$h‍_a => (regexpPrototype = $h‍_a)]],["globalThis", [$h‍_a => (globalThis = $h‍_a)]]]],["./compartment.js", [["InertCompartment", [$h‍_a => (InertCompartment = $h‍_a)]]]]]);   


















/**
 * Object.getConstructorOf()
 * Helper function to improve readability, similar to Object.getPrototypeOf().
 *
 * @param {object} obj
 */
function getConstructorOf(obj) {
  return getPrototypeOf(obj).constructor;
 }

// getAnonymousIntrinsics uses a utility function to construct an arguments
// object, since it cannot have one of its own and also be a const export.
function makeArguments() {
  // eslint-disable-next-line prefer-rest-params
  return arguments;
 }

/**
 * getAnonymousIntrinsics()
 * Get the intrinsics not otherwise reachable by named own property
 * traversal from the global object.
 *
 * @returns {object}
 */
const        getAnonymousIntrinsics=  ()=>  {
  const InertFunction=  FERAL_FUNCTION.prototype.constructor;

  // 9.2.4.1 %ThrowTypeError%

  const argsCalleeDesc=  getOwnPropertyDescriptor(makeArguments(), 'callee');
  const ThrowTypeError=  argsCalleeDesc&&  argsCalleeDesc.get;

  // 21.1.5.2 The %StringIteratorPrototype% Object

  // eslint-disable-next-line no-new-wrappers
  const StringIteratorObject=  iterateString(new String());
  const StringIteratorPrototype=  getPrototypeOf(StringIteratorObject);

  // 21.2.7.1 The %RegExpStringIteratorPrototype% Object
  const RegExpStringIterator=
    regexpPrototype[matchAllSymbol]&&  matchAllRegExp(/./);
  const RegExpStringIteratorPrototype=
    RegExpStringIterator&&  getPrototypeOf(RegExpStringIterator);

  // 22.1.5.2 The %ArrayIteratorPrototype% Object

  // eslint-disable-next-line no-array-constructor
  const ArrayIteratorObject=  iterateArray([]);
  const ArrayIteratorPrototype=  getPrototypeOf(ArrayIteratorObject);

  // 22.2.1 The %TypedArray% Intrinsic Object

  const TypedArray=  getPrototypeOf(Float32Array);

  // 23.1.5.2 The %MapIteratorPrototype% Object

  const MapIteratorObject=  iterateMap(new Map());
  const MapIteratorPrototype=  getPrototypeOf(MapIteratorObject);

  // 23.2.5.2 The %SetIteratorPrototype% Object

  const SetIteratorObject=  iterateSet(new Set());
  const SetIteratorPrototype=  getPrototypeOf(SetIteratorObject);

  // 25.1.2 The %IteratorPrototype% Object

  const IteratorPrototype=  getPrototypeOf(ArrayIteratorPrototype);

  // 25.2.1 The GeneratorFunction Constructor

  // eslint-disable-next-line no-empty-function
  function* GeneratorFunctionInstance() { }
  const GeneratorFunction=  getConstructorOf(GeneratorFunctionInstance);

  // 25.2.3 Properties of the GeneratorFunction Prototype Object

  const Generator=  GeneratorFunction.prototype;

  // 25.3.1 The AsyncGeneratorFunction Constructor

  // eslint-disable-next-line no-empty-function
  async function* AsyncGeneratorFunctionInstance() { }
  const AsyncGeneratorFunction=  getConstructorOf(
    AsyncGeneratorFunctionInstance);


  // 25.3.2.2 AsyncGeneratorFunction.prototype
  const AsyncGenerator=  AsyncGeneratorFunction.prototype;
  // 25.5.1 Properties of the AsyncGenerator Prototype Object
  const AsyncGeneratorPrototype=  AsyncGenerator.prototype;
  const AsyncIteratorPrototype=  getPrototypeOf(AsyncGeneratorPrototype);

  // 25.7.1 The AsyncFunction Constructor

  // eslint-disable-next-line no-empty-function
  async function AsyncFunctionInstance() { }
  const AsyncFunction=  getConstructorOf(AsyncFunctionInstance);

  const intrinsics=  {
    '%InertFunction%': InertFunction,
    '%ArrayIteratorPrototype%': ArrayIteratorPrototype,
    '%InertAsyncFunction%': AsyncFunction,
    '%AsyncGenerator%': AsyncGenerator,
    '%InertAsyncGeneratorFunction%': AsyncGeneratorFunction,
    '%AsyncGeneratorPrototype%': AsyncGeneratorPrototype,
    '%AsyncIteratorPrototype%': AsyncIteratorPrototype,
    '%Generator%': Generator,
    '%InertGeneratorFunction%': GeneratorFunction,
    '%IteratorPrototype%': IteratorPrototype,
    '%MapIteratorPrototype%': MapIteratorPrototype,
    '%RegExpStringIteratorPrototype%': RegExpStringIteratorPrototype,
    '%SetIteratorPrototype%': SetIteratorPrototype,
    '%StringIteratorPrototype%': StringIteratorPrototype,
    '%ThrowTypeError%': ThrowTypeError,
    '%TypedArray%': TypedArray,
    '%InertCompartment%': InertCompartment};


  if( globalThis.Iterator) {
    intrinsics['%IteratorHelperPrototype%']=  getPrototypeOf(
      // eslint-disable-next-line @endo/no-polymorphic-call
      globalThis.Iterator.from([]).take(0));

    intrinsics['%WrapForValidIteratorPrototype%']=  getPrototypeOf(
      // eslint-disable-next-line @endo/no-polymorphic-call
      globalThis.Iterator.from({ next() { }}));

   }

  if( globalThis.AsyncIterator) {
    intrinsics['%AsyncIteratorHelperPrototype%']=  getPrototypeOf(
      // eslint-disable-next-line @endo/no-polymorphic-call
      globalThis.AsyncIterator.from([]).take(0));

    intrinsics['%WrapForValidAsyncIteratorPrototype%']=  getPrototypeOf(
      // eslint-disable-next-line @endo/no-polymorphic-call
      globalThis.AsyncIterator.from({ next() { }}));

   }

  return intrinsics;
 };$h‍_once.getAnonymousIntrinsics(getAnonymousIntrinsics);
})()
,
// === functors[46] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let TypeError,freeze;$h‍_imports([["./commons.js", [["TypeError", [$h‍_a => (TypeError = $h‍_a)]],["freeze", [$h‍_a => (freeze = $h‍_a)]]]]]);   


const        tameHarden=  (safeHarden, hardenTaming)=>  {
  if( hardenTaming!==  'safe'&&  hardenTaming!==  'unsafe') {
    throw TypeError( `unrecognized fakeHardenOption ${hardenTaming}`);
   }

  if( hardenTaming===  'safe') {
    return safeHarden;
   }

  // In on the joke
  Object.isExtensible=  ()=>  false;
  Object.isFrozen=  ()=>  true;
  Object.isSealed=  ()=>  true;
  Reflect.isExtensible=  ()=>  false;

  if( safeHarden.isFake) {
    // The "safe" hardener is already a fake hardener.
    // Just use it.
    return safeHarden;
   }

  const fakeHarden=  (arg)=>arg;
  fakeHarden.isFake=  true;
  return freeze(fakeHarden);
 };$h‍_once.tameHarden(tameHarden);
freeze(tameHarden);
})()
,
// === functors[47] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let Symbol,entries,fromEntries,getOwnPropertyDescriptors,defineProperties,arrayMap,functionBind;$h‍_imports([["./commons.js", [["Symbol", [$h‍_a => (Symbol = $h‍_a)]],["entries", [$h‍_a => (entries = $h‍_a)]],["fromEntries", [$h‍_a => (fromEntries = $h‍_a)]],["getOwnPropertyDescriptors", [$h‍_a => (getOwnPropertyDescriptors = $h‍_a)]],["defineProperties", [$h‍_a => (defineProperties = $h‍_a)]],["arrayMap", [$h‍_a => (arrayMap = $h‍_a)]],["functionBind", [$h‍_a => (functionBind = $h‍_a)]]]]]);   









/**
 * This taming provides a tamed alternative to the original `Symbol` constructor
 * that starts off identical, except that all its properties are "temporarily"
 * configurable. The original `Symbol` constructor remains unmodified on
 * the start compartment's global. The tamed alternative is used as the shared
 * `Symbol` constructor on constructed compartments.
 *
 * Starting these properties as configurable assumes two succeeding phases of
 * processing: A whitelisting phase, that
 * removes all properties not on the whitelist (which requires them to be
 * configurable) and a global hardening step that freezes all primordials,
 * returning these properties to their expected non-configurable status.
 *
 * The ses shim is constructed to eventually enable vetted shims to run between
 * repair and global hardening. However, such vetted shims would normally
 * run in the start compartment, which continues to use the original unmodified
 * `Symbol`, so they should not normally be affected by the temporary
 * configurability of these properties.
 *
 * Note that the spec refers to the global `Symbol` function as the
 * ["Symbol Constructor"](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-symbol-constructor)
 * even though it has a call behavior (can be called as a function) and does not
 * not have a construct behavior (cannot be called with `new`). Accordingly,
 * to tame it, we must replace it with a function without a construct
 * behavior.
 */
const        tameSymbolConstructor=  ()=>  {
  const OriginalSymbol=  Symbol;
  const SymbolPrototype=  OriginalSymbol.prototype;

  // Bypass Hermes bug, fixed in: https://github.com/facebook/hermes/commit/00f18c89c720e1c34592bb85a1a8d311e6e99599
  // Make a "copy" of the primordial [Symbol "constructor"](https://tc39.es/ecma262/#sec-symbol-description) which maintains all observable behavior. The primordial explicitly throws on `[[Construct]]` and has a `[[Call]]` which ignores the receiver. Binding also maintains the `toString` source as a native function. The `name` is restored below when copying own properties.
  const SharedSymbol=  functionBind(Symbol, undefined);

  defineProperties(SymbolPrototype, {
    constructor: {
      value: SharedSymbol
      // leave other `constructor` attributes as is
}});


  const originalDescsEntries=  entries(
    getOwnPropertyDescriptors(OriginalSymbol));

  const descs=  fromEntries(
    arrayMap(originalDescsEntries, ([name, desc])=>  [
      name,
      { ...desc, configurable: true}]));


  defineProperties(SharedSymbol, descs);

  return { '%SharedSymbol%': SharedSymbol};
 };$h‍_once.tameSymbolConstructor(tameSymbolConstructor);
})()
,
// === functors[48] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let getOwnPropertyDescriptor,apply,defineProperty,toStringTagSymbol;$h‍_imports([["./commons.js", [["getOwnPropertyDescriptor", [$h‍_a => (getOwnPropertyDescriptor = $h‍_a)]],["apply", [$h‍_a => (apply = $h‍_a)]],["defineProperty", [$h‍_a => (defineProperty = $h‍_a)]],["toStringTagSymbol", [$h‍_a => (toStringTagSymbol = $h‍_a)]]]]]);   






const throws=  (thunk)=>{
  try {
    thunk();
    return false;
   }catch( er) {
    return true;
   }
 };

/**
 * Exported for convenience of unit testing. Harmless, but not expected
 * to be useful by itself.
 *
 * @param {any} obj
 * @param {string|symbol} prop
 * @param {any} expectedValue
 * @returns {boolean}
 * Returns whether `tameFauxDataProperty` turned the property in question
 * from an apparent faux data property into the actual data property it
 * seemed to emulate.
 * If this function returns `false`, then we hope no effects happened.
 * However, sniffing out if an accessor property seems to be a faux data
 * property requires invoking the getter and setter functions that might
 * possibly have side effects.
 * `tameFauxDataProperty` is not in a position to tell.
 */
const        tameFauxDataProperty=  (obj, prop, expectedValue)=>  {
  if( obj===  undefined) {
    // The object does not exist in this version of the platform
    return false;
   }
  const desc=  getOwnPropertyDescriptor(obj, prop);
  if( !desc||  'value'in  desc) {
    // The property either doesn't exist, or is already an actual data property.
    return false;
   }
  const { get, set}=   desc;
  if( typeof get!==  'function'||  typeof set!==  'function') {
    // A faux data property has both a getter and a setter
    return false;
   }
  if( get()!==  expectedValue) {
    // The getter called by itself should produce the expectedValue
    return false;
   }
  if( apply(get, obj, [])!==  expectedValue) {
    // The getter called with `this === obj` should also return the
    // expectedValue.
    return false;
   }
  const testValue=  'Seems to be a setter';
  const subject1=  { __proto__: null};
  apply(set, subject1, [testValue]);
  if( subject1[prop]!==  testValue) {
    // The setter called with an unrelated object as `this` should
    // set the property on the object.
    return false;
   }
  const subject2=  { __proto__: obj};
  apply(set, subject2, [testValue]);
  if( subject2[prop]!==  testValue) {
    // The setter called on an object that inherits from `obj` should
    // override the property from `obj` as if by assignment.
    return false;
   }
  if( !throws(()=>  apply(set, obj, [expectedValue]))) {
    // The setter called with `this === obj` should throw without having
    // caused any effect.
    // This is the test that has the greatest danger of leaving behind some
    // persistent side effect. The most obvious one is to emulate a
    // successful assignment to the property. That's why this test
    // uses `expectedValue`, so that case is likely not to actually
    // change anything.
    return false;
   }
  if( 'originalValue'in  get) {
    // The ses-shim uniquely, as far as we know, puts an `originalValue`
    // property on the getter, so that reflect property tranversal algorithms,
    // like `harden`, will traverse into the enulated value without
    // calling the getter. That does not happen until `permits-intrinsics.js`
    // which is much later. So if we see one this early, we should
    // not assume we understand what's going on.
    return false;
   }

  // We assume that this code runs before any untrusted code runs, so
  // we do not need to worry about the above conditions passing because of
  // malicious intent. In fact, it runs even before vetted shims are supposed
  // to run, between repair and hardening. Given that, after all these tests
  // pass, we have adequately validated that the property in question is
  // an accessor function whose purpose is suppressing the override mistake,
  // i.e., enabling a non-writable property to be overridden by assignment.
  // In that case, here we *temporarily* turn it into the data property
  // it seems to emulate, but writable so that it does not trigger the
  // override mistake while in this temporary state.

  // For those properties that are also listed in `enablements.js`,
  // that phase will re-enable override for these properties, but
  // via accessor functions that SES controls, so we know what they are
  // doing. In addition, the getter functions installed by
  // `enable-property-overrides.js` have an `originalValue` field
  // enabling meta-traversal code like harden to visit the original value
  // without calling the getter.

  if( desc.configurable===  false) {
    // Even though it seems to be a faux data property, we're unable to fix it.
    return false;
   }

  // Many of the `return false;` cases above plausibly should be turned into
  // errors, or an least generate warnings. However, for those, the checks
  // following this phase are likely to signal an error anyway.

  // At this point, we have passed all our sniff checks for validating that
  // it seems to be a faux data property with the expected value. Turn
  // it into the actual data property it emulates, but writable so there is
  // not yet an override mistake problem.

  defineProperty(obj, prop, {
    value: expectedValue,
    writable: true,
    enumerable: desc.enumerable,
    configurable: true});


  return true;
 };

/**
 * In JavaScript, the so-called "override mistake" is the inability to
 * override an inherited non-writable data property by assignment. A common
 * workaround is to instead define an accessor property that acts like
 * a non-writable data property, except that it allows an object that
 * inherits this property to override it by assignment. Let's call
 * an access property that acts this way a "faux data property". In this
 * ses-shim, `enable-property-overrides.js` makes the properties listed in
 * `enablements.js` into faux data properties.
 *
 * But the ses-shim is not alone in use of this trick. Starting with the
 * [Iterator Helpers proposal](https://github.com/tc39/proposal-iterator-helpers),
 * some properties are defined as (what we call) faux data properties.
 * Some of these are new properties (`Interator.prototype.constructor`) and
 * some are old data properties converted to accessor properties
 * (`Iterator.prototype[String.toStringTag]`). So the ses-shim needs to be
 * prepared for some enumerated set of properties to already be faux data
 * properties in the platform prior to our initialization.
 *
 * For these possible faux data properties, it is important that
 * `permits.js` describe each as a data property, so that it can further
 * constrain the apparent value (that allegedly would be returned by the
 * getter) according to its own permits.
 *
 * However, at the time of this writing, the precise behavior specified
 * by the iterator-helpers proposal for these faux data properties is
 * novel. We should not be too confident that all further such platform
 * additions do what we would now expect. So, for each of these possible
 * faux data properties, we do some sniffing to see if it behaves as we
 * currently expect a faux data property to act. If not, then
 * `tameFauxDataProperties` tries not to modify it, leaving it to later
 * checks, especially `permits-intrinsics.js`, to error when it sees an
 * unexpected accessor.
 *
 * If one of these enumerated accessor properties does seem to be
 * a faithful faux data property, then `tameFauxDataProperties` itself
 * *tempoarily* turns it into the actual data property that it seems to emulate.
 * This data property starts as writable, so that in this state it will
 * not trigger the override mistake, i.e., assignment to an object inheriting
 * this property is allowed to succeed at overriding this property.
 *
 * For those properties that should be a faux data property rather than an
 * actual one, such as those from the iterator-helpers proposal,
 * they should be listed as such in `enablements.js`, so
 * `enable-property-overrides.js` will turn it back into a faux data property.
 * But one controlled by the ses-shim, whose behavior we understand.
 *
 * `tameFauxDataProperties`, which turns these into actual data properties,
 * happens during the `repairIntrinsics` phase
 * of `lockdown`, before even vetted shim are supposed to run.
 * `enable-property-overrides.js` runs after vetted shims, turning the
 * appropriate ones back into faux data properties. Thus vetted shims
 * can observe the possibly non-conforming state where these are temporarily
 * actual data properties, rather than faux data properties.
 *
 * Coordinate the property enumeration here
 * with `enablements.js`, so the appropriate properties are
 * turned back to faux data properties.
 *
 * @param {Record<any,any>} intrinsics
 */$h‍_once.tameFauxDataProperty(tameFauxDataProperty);
const        tameFauxDataProperties=  (intrinsics)=>{
  // https://github.com/tc39/proposal-iterator-helpers
  tameFauxDataProperty(
    intrinsics['%IteratorPrototype%'],
    'constructor',
    intrinsics.Iterator);

  // https://github.com/tc39/proposal-iterator-helpers
  tameFauxDataProperty(
    intrinsics['%IteratorPrototype%'],
    toStringTagSymbol,
    'Iterator');

 };$h‍_once.tameFauxDataProperties(tameFauxDataProperties);
})()
,
// === functors[49] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let getenv,FERAL_FUNCTION,FERAL_EVAL,TypeError,arrayFilter,globalThis,is,ownKeys,stringSplit,noEvalEvaluate,getOwnPropertyNames,getPrototypeOf,makeHardener,makeIntrinsicsCollector,whitelistIntrinsics,tameFunctionConstructors,tameDateConstructor,tameMathObject,tameRegExpConstructor,enablePropertyOverrides,tameLocaleMethods,setGlobalObjectConstantProperties,setGlobalObjectMutableProperties,setGlobalObjectEvaluators,makeSafeEvaluator,initialGlobalPropertyNames,tameFunctionToString,tameDomains,tameConsole,tameErrorConstructor,assert,makeAssert,getAnonymousIntrinsics,makeCompartmentConstructor,tameHarden,tameSymbolConstructor,tameFauxDataProperties;$h‍_imports([["@endo/env-options", [["getEnvironmentOption", [$h‍_a => (getenv = $h‍_a)]]]],["./commons.js", [["FERAL_FUNCTION", [$h‍_a => (FERAL_FUNCTION = $h‍_a)]],["FERAL_EVAL", [$h‍_a => (FERAL_EVAL = $h‍_a)]],["TypeError", [$h‍_a => (TypeError = $h‍_a)]],["arrayFilter", [$h‍_a => (arrayFilter = $h‍_a)]],["globalThis", [$h‍_a => (globalThis = $h‍_a)]],["is", [$h‍_a => (is = $h‍_a)]],["ownKeys", [$h‍_a => (ownKeys = $h‍_a)]],["stringSplit", [$h‍_a => (stringSplit = $h‍_a)]],["noEvalEvaluate", [$h‍_a => (noEvalEvaluate = $h‍_a)]],["getOwnPropertyNames", [$h‍_a => (getOwnPropertyNames = $h‍_a)]],["getPrototypeOf", [$h‍_a => (getPrototypeOf = $h‍_a)]]]],["./make-hardener.js", [["makeHardener", [$h‍_a => (makeHardener = $h‍_a)]]]],["./intrinsics.js", [["makeIntrinsicsCollector", [$h‍_a => (makeIntrinsicsCollector = $h‍_a)]]]],["./permits-intrinsics.js", [["default", [$h‍_a => (whitelistIntrinsics = $h‍_a)]]]],["./tame-function-constructors.js", [["default", [$h‍_a => (tameFunctionConstructors = $h‍_a)]]]],["./tame-date-constructor.js", [["default", [$h‍_a => (tameDateConstructor = $h‍_a)]]]],["./tame-math-object.js", [["default", [$h‍_a => (tameMathObject = $h‍_a)]]]],["./tame-regexp-constructor.js", [["default", [$h‍_a => (tameRegExpConstructor = $h‍_a)]]]],["./enable-property-overrides.js", [["default", [$h‍_a => (enablePropertyOverrides = $h‍_a)]]]],["./tame-locale-methods.js", [["default", [$h‍_a => (tameLocaleMethods = $h‍_a)]]]],["./global-object.js", [["setGlobalObjectConstantProperties", [$h‍_a => (setGlobalObjectConstantProperties = $h‍_a)]],["setGlobalObjectMutableProperties", [$h‍_a => (setGlobalObjectMutableProperties = $h‍_a)]],["setGlobalObjectEvaluators", [$h‍_a => (setGlobalObjectEvaluators = $h‍_a)]]]],["./make-safe-evaluator.js", [["makeSafeEvaluator", [$h‍_a => (makeSafeEvaluator = $h‍_a)]]]],["./permits.js", [["initialGlobalPropertyNames", [$h‍_a => (initialGlobalPropertyNames = $h‍_a)]]]],["./tame-function-tostring.js", [["tameFunctionToString", [$h‍_a => (tameFunctionToString = $h‍_a)]]]],["./tame-domains.js", [["tameDomains", [$h‍_a => (tameDomains = $h‍_a)]]]],["./error/tame-console.js", [["tameConsole", [$h‍_a => (tameConsole = $h‍_a)]]]],["./error/tame-error-constructor.js", [["default", [$h‍_a => (tameErrorConstructor = $h‍_a)]]]],["./error/assert.js", [["assert", [$h‍_a => (assert = $h‍_a)]],["makeAssert", [$h‍_a => (makeAssert = $h‍_a)]]]],["./get-anonymous-intrinsics.js", [["getAnonymousIntrinsics", [$h‍_a => (getAnonymousIntrinsics = $h‍_a)]]]],["./compartment.js", [["makeCompartmentConstructor", [$h‍_a => (makeCompartmentConstructor = $h‍_a)]]]],["./tame-harden.js", [["tameHarden", [$h‍_a => (tameHarden = $h‍_a)]]]],["./tame-symbol-constructor.js", [["tameSymbolConstructor", [$h‍_a => (tameSymbolConstructor = $h‍_a)]]]],["./tame-faux-data-properties.js", [["tameFauxDataProperties", [$h‍_a => (tameFauxDataProperties = $h‍_a)]]]]]);   

























































/** @import {LockdownOptions} from '../types.js' */

const { Fail, details: d, quote: q}=   assert;

/** @type {Error=} */
let priorRepairIntrinsics;

/** @type {Error=} */
let priorHardenIntrinsics;

// Build a harden() with an empty fringe.
// Gate it on lockdown.
/**
 * @template T
 * @param {T} ref
 * @returns {T}
 */
const safeHarden=  makeHardener();

/**
 * @callback Transform
 * @param {string} source
 * @returns {string}
 */

/**
 * @callback CompartmentConstructor
 * @param {object} endowments
 * @param {object} moduleMap
 * @param {object} [options]
 * @param {Array<Transform>} [options.transforms]
 * @param {Array<Transform>} [options.__shimTransforms__]
 */

// TODO https://github.com/endojs/endo/issues/814
// Lockdown currently allows multiple calls provided that the specified options
// of every call agree.  With experience, we have observed that lockdown should
// only ever need to be called once and that simplifying lockdown will improve
// the quality of audits.

const assertDirectEvalAvailable=  ()=>  {
  let allowed=  false;
  try {
    allowed=  FERAL_FUNCTION(
      'eval',
      'SES_changed',
       `\
        eval("SES_changed = true");
        return SES_changed;
      `)(
      FERAL_EVAL, false);
    // If we get here and SES_changed stayed false, that means the eval was sloppy
    // and indirect, which generally creates a new global.
    // We are going to throw an exception for failing to initialize SES, but
    // good neighbors clean up.
    if( !allowed) {
      delete globalThis.SES_changed;
     }
   }catch( _error) {
    // We reach here if eval is outright forbidden by a Content Security Policy.
    // We allow this for SES usage that delegates the responsibility to isolate
    // guest code to production code generation.
    allowed=  true;
   }
  if( !allowed) {
    // See https://github.com/endojs/endo/blob/master/packages/ses/error-codes/SES_DIRECT_EVAL.md
    throw TypeError(
       `SES cannot initialize unless 'eval' is the original intrinsic 'eval', suitable for direct-eval (dynamically scoped eval) (SES_DIRECT_EVAL)`);

   }
 };

/**
 * @param {LockdownOptions} [options]
 */
const        repairIntrinsics=  (options=  {})=>  {
  // First time, absent options default to 'safe'.
  // Subsequent times, absent options default to first options.
  // Thus, all present options must agree with first options.
  // Reconstructing `option` here also ensures that it is a well
  // behaved record, with only own data properties.
  //
  // The `overrideTaming` is not a safety issue. Rather it is a tradeoff
  // between code compatibility, which is better with the `'moderate'`
  // setting, and tool compatibility, which is better with the `'min'`
  // setting. See
  // https://github.com/Agoric/SES-shim/blob/master/packages/ses/README.md#enabling-override-by-assignment)
  // for an explanation of when to use which.
  //
  // The `stackFiltering` is not a safety issue. Rather it is a tradeoff
  // between relevance and completeness of the stack frames shown on the
  // console. Setting`stackFiltering` to `'verbose'` applies no filters, providing
  // the raw stack frames that can be quite versbose. Setting
  // `stackFrameFiltering` to`'concise'` limits the display to the stack frame
  // information most likely to be relevant, eliminating distracting frames
  // such as those from the infrastructure. However, the bug you're trying to
  // track down might be in the infrastrure, in which case the `'verbose'` setting
  // is useful. See
  // [`stackFiltering` options](https://github.com/Agoric/SES-shim/blob/master/packages/ses/docs/lockdown.md#stackfiltering-options)
  // for an explanation.

  const {
    errorTaming=  getenv('LOCKDOWN_ERROR_TAMING', 'safe'),
    errorTrapping=  /** @type {"platform" | "none" | "report" | "abort" | "exit" | undefined} */
      getenv('LOCKDOWN_ERROR_TRAPPING', 'platform'),

    unhandledRejectionTrapping=  /** @type {"none" | "report" | undefined} */
      getenv('LOCKDOWN_UNHANDLED_REJECTION_TRAPPING', 'report'),

    regExpTaming=  getenv('LOCKDOWN_REGEXP_TAMING', 'safe'),
    localeTaming=  getenv('LOCKDOWN_LOCALE_TAMING', 'safe'),

    consoleTaming=  /** @type {'unsafe' | 'safe' | undefined} */
      getenv('LOCKDOWN_CONSOLE_TAMING', 'safe'),

    overrideTaming=  getenv('LOCKDOWN_OVERRIDE_TAMING', 'moderate'),
    stackFiltering=  getenv('LOCKDOWN_STACK_FILTERING', 'concise'),
    domainTaming=  getenv('LOCKDOWN_DOMAIN_TAMING', 'safe'),
    evalTaming=  getenv('LOCKDOWN_EVAL_TAMING', 'safeEval'),
    overrideDebug=  arrayFilter(
      stringSplit(getenv('LOCKDOWN_OVERRIDE_DEBUG', ''), ','),
      /** @param {string} debugName */
      (debugName)=>debugName!==  ''),

    __hardenTaming__=  getenv('LOCKDOWN_HARDEN_TAMING', 'safe'),
    dateTaming=  'safe', // deprecated
    mathTaming=  'safe', // deprecated
    ...extraOptions}=
      options;

  evalTaming===  'unsafeEval'||
    evalTaming===  'safeEval'||
    evalTaming===  'noEval'||
    Fail `lockdown(): non supported option evalTaming: ${q(evalTaming)}`;

  // Assert that only supported options were passed.
  // Use Reflect.ownKeys to reject symbol-named properties as well.
  const extraOptionsNames=  ownKeys(extraOptions);
  extraOptionsNames.length===  0||
    Fail `lockdown(): non supported option ${q(extraOptionsNames)}`;

  priorRepairIntrinsics===  undefined||
    // eslint-disable-next-line @endo/no-polymorphic-call
    assert.fail(
      d `Already locked down at ${priorRepairIntrinsics} (SES_ALREADY_LOCKED_DOWN)`,
      TypeError);

  // See https://github.com/endojs/endo/blob/master/packages/ses/error-codes/SES_ALREADY_LOCKED_DOWN.md
  priorRepairIntrinsics=  TypeError('Prior lockdown (SES_ALREADY_LOCKED_DOWN)');
  // Tease V8 to generate the stack string and release the closures the stack
  // trace retained:
  priorRepairIntrinsics.stack;

  assertDirectEvalAvailable();

  /**
   * Because of packagers and bundlers, etc, multiple invocations of lockdown
   * might happen in separate instantiations of the source of this module.
   * In that case, each one sees its own `firstOptions` variable, so the test
   * above will not detect that lockdown has already happened. We
   * unreliably test some telltale signs that lockdown has run, to avoid
   * trying to lock down a locked down environment. Although the test is
   * unreliable, this is consistent with the SES threat model. SES provides
   * security only if it runs first in a given realm, or if everything that
   * runs before it is SES-aware and cooperative. Neither SES nor anything
   * can protect itself from corrupting code that runs first. For these
   * purposes, code that turns a realm into something that passes these
   * tests without actually locking down counts as corrupting code.
   *
   * The specifics of what this tests for may change over time, but it
   * should be consistent with any setting of the lockdown options.
   */
  const seemsToBeLockedDown=  ()=>  {
    return(
      globalThis.Function.prototype.constructor!==  globalThis.Function&&
      // @ts-ignore harden is absent on globalThis type def.
      typeof globalThis.harden===  'function'&&
      // @ts-ignore lockdown is absent on globalThis type def.
      typeof globalThis.lockdown===  'function'&&
      globalThis.Date.prototype.constructor!==  globalThis.Date&&
      typeof globalThis.Date.now===  'function'&&
      // @ts-ignore does not recognize that Date constructor is a special
      // Function.
      // eslint-disable-next-line @endo/no-polymorphic-call
      is(globalThis.Date.prototype.constructor.now(), NaN));

   };

  if( seemsToBeLockedDown()) {
    // See https://github.com/endojs/endo/blob/master/packages/ses/error-codes/SES_MULTIPLE_INSTANCES.md
    throw TypeError(
       `Already locked down but not by this SES instance (SES_MULTIPLE_INSTANCES)`);

   }

  /**
   * 1. TAME powers & gather intrinsics first.
   */

  tameDomains(domainTaming);

  // Replace Function.prototype.toString with one that recognizes
  // shimmed functions as honorary native functions.
  const markVirtualizedNativeFunction=  tameFunctionToString();

  const { addIntrinsics, completePrototypes, finalIntrinsics}=
    makeIntrinsicsCollector();

  const tamedHarden=  tameHarden(safeHarden, __hardenTaming__);
  addIntrinsics({ harden: tamedHarden});

  addIntrinsics(tameFunctionConstructors());

  addIntrinsics(tameDateConstructor(dateTaming));
  addIntrinsics(tameErrorConstructor(errorTaming, stackFiltering));
  addIntrinsics(tameMathObject(mathTaming));
  addIntrinsics(tameRegExpConstructor(regExpTaming));
  addIntrinsics(tameSymbolConstructor());

  addIntrinsics(getAnonymousIntrinsics());

  completePrototypes();

  const intrinsics=  finalIntrinsics();

  const hostIntrinsics=  { __proto__: null};

  // The Node.js Buffer is a derived class of Uint8Array, and as such is often
  // passed around where a Uint8Array is expected.
  if( typeof globalThis.Buffer===  'function') {
    hostIntrinsics.Buffer=  globalThis.Buffer;
   }

  /**
   * Wrap console unless suppressed.
   * At the moment, the console is considered a host power in the start
   * compartment, and not a primordial. Hence it is absent from the whilelist
   * and bypasses the intrinsicsCollector.
   *
   * @type {((error: any) => string | undefined) | undefined}
   */
  let optGetStackString;
  if( errorTaming!==  'unsafe') {
    optGetStackString=  intrinsics['%InitialGetStackString%'];
   }
  const consoleRecord=  tameConsole(
    consoleTaming,
    errorTrapping,
    unhandledRejectionTrapping,
    optGetStackString);

  globalThis.console=  /** @type {Console} */  consoleRecord.console;

  // The untamed Node.js console cannot itself be hardened as it has mutable
  // internal properties, but some of these properties expose internal versions
  // of classes from node's "primordials" concept.
  // eslint-disable-next-line no-underscore-dangle
  if( typeof  /** @type {any} */  consoleRecord.console. _times===   'object') {
    // SafeMap is a derived Map class used internally by Node
    // There doesn't seem to be a cleaner way to reach it.
    hostIntrinsics.SafeMap=  getPrototypeOf(
      // eslint-disable-next-line no-underscore-dangle
      /** @type {any} */  consoleRecord.console. _times);

   }

  // @ts-ignore assert is absent on globalThis type def.
  if( errorTaming===  'unsafe'&&  globalThis.assert===  assert) {
    // If errorTaming is 'unsafe' we replace the global assert with
    // one whose `details` template literal tag does not redact
    // unmarked substitution values. IOW, it blabs information that
    // was supposed to be secret from callers, as an aid to debugging
    // at a further cost in safety.
    // @ts-ignore assert is absent on globalThis type def.
    globalThis.assert=  makeAssert(undefined, true);
   }

  // Replace *Locale* methods with their non-locale equivalents
  tameLocaleMethods(intrinsics, localeTaming);

  tameFauxDataProperties(intrinsics);

  /**
   * 2. WHITELIST to standardize the environment.
   */

  // Remove non-standard properties.
  // All remaining function encountered during whitelisting are
  // branded as honorary native functions.
  whitelistIntrinsics(intrinsics, markVirtualizedNativeFunction);

  // Initialize the powerful initial global, i.e., the global of the
  // start compartment, from the intrinsics.

  setGlobalObjectConstantProperties(globalThis);

  setGlobalObjectMutableProperties(globalThis, {
    intrinsics,
    newGlobalPropertyNames: initialGlobalPropertyNames,
    makeCompartmentConstructor,
    markVirtualizedNativeFunction});


  if( evalTaming===  'noEval') {
    setGlobalObjectEvaluators(
      globalThis,
      noEvalEvaluate,
      markVirtualizedNativeFunction);

   }else if( evalTaming===  'safeEval') {
    const { safeEvaluate}=   makeSafeEvaluator({ globalObject: globalThis});
    setGlobalObjectEvaluators(
      globalThis,
      safeEvaluate,
      markVirtualizedNativeFunction);

   }else if( evalTaming===  'unsafeEval') {
    // Leave eval function and Function constructor of the initial compartment in-tact.
    // Other compartments will not have access to these evaluators unless a guest program
    // escapes containment.
   }

  /**
   * 3. HARDEN to share the intrinsics.
   *
   * We define hardenIntrinsics here so that options are in scope, but return
   * it to the caller because we intend to eventually allow vetted shims to run
   * between repairs and the hardening of intrinsics and so we can benchmark
   * repair separately from hardening.
   */

  const hardenIntrinsics=  ()=>  {
    priorHardenIntrinsics===  undefined||
      // eslint-disable-next-line @endo/no-polymorphic-call
      assert.fail(
        d `Already locked down at ${priorHardenIntrinsics} (SES_ALREADY_LOCKED_DOWN)`,
        TypeError);

    // See https://github.com/endojs/endo/blob/master/packages/ses/error-codes/SES_ALREADY_LOCKED_DOWN.md
    priorHardenIntrinsics=  TypeError(
      'Prior lockdown (SES_ALREADY_LOCKED_DOWN)');

    // Tease V8 to generate the stack string and release the closures the stack
    // trace retained:
    priorHardenIntrinsics.stack;

    // Circumvent the override mistake.
    // TODO consider moving this to the end of the repair phase, and
    // therefore before vetted shims rather than afterwards. It is not
    // clear yet which is better.
    // @ts-ignore enablePropertyOverrides does its own input validation
    enablePropertyOverrides(intrinsics, overrideTaming, overrideDebug);

    // Finally register and optionally freeze all the intrinsics. This
    // must be the operation that modifies the intrinsics.
    const toHarden=  {
      intrinsics,
      hostIntrinsics,
      globals: {
        // Harden evaluators
        Function: globalThis.Function,
        eval: globalThis.eval,
        // @ts-ignore Compartment does exist on globalThis
        Compartment: globalThis.Compartment,

        // Harden Symbol
        Symbol: globalThis.Symbol}};



    // Harden Symbol and properties for initialGlobalPropertyNames in the host realm
    for( const prop of getOwnPropertyNames(initialGlobalPropertyNames)) {
      toHarden.globals[prop]=  globalThis[prop];
     }

    tamedHarden(toHarden);

    return tamedHarden;
   };

  return hardenIntrinsics;
 };$h‍_once.repairIntrinsics(repairIntrinsics);
})()
,
// === functors[50] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let globalThis,repairIntrinsics;$h‍_imports([["./assert-sloppy-mode.js", []],["./commons.js", [["globalThis", [$h‍_a => (globalThis = $h‍_a)]]]],["./lockdown.js", [["repairIntrinsics", [$h‍_a => (repairIntrinsics = $h‍_a)]]]]]);   








/** @import {LockdownOptions} from '../types.js' */

/**
 * @param {LockdownOptions} options
 */
globalThis.lockdown=  (options)=>{
  const hardenIntrinsics=  repairIntrinsics(options);
  globalThis.harden=  hardenIntrinsics();
 };

/**
 * @param {LockdownOptions} options
 */
globalThis.repairIntrinsics=  (options)=>{
  const hardenIntrinsics=  repairIntrinsics(options);
  // Reveal hardenIntrinsics after repairs.
  globalThis.hardenIntrinsics=  ()=>  {
    // Reveal harden after hardenIntrinsics.
    // Harden is dangerous before hardenIntrinsics because hardening just
    // about anything will inadvertently render intrinsics irreparable.
    // Also, for modules that must work both before or after lockdown (code
    // that is portable between JS and SES), the existence of harden in global
    // scope signals whether such code should attempt to use harden in the
    // defense of its own API.
    // @ts-ignore harden not yet recognized on globalThis.
    globalThis.harden=  hardenIntrinsics();
   };
 };
})()
,
// === functors[51] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let globalThis,makeCompartmentConstructor,tameFunctionToString,getGlobalIntrinsics;$h‍_imports([["./commons.js", [["globalThis", [$h‍_a => (globalThis = $h‍_a)]]]],["./compartment.js", [["makeCompartmentConstructor", [$h‍_a => (makeCompartmentConstructor = $h‍_a)]]]],["./tame-function-tostring.js", [["tameFunctionToString", [$h‍_a => (tameFunctionToString = $h‍_a)]]]],["./intrinsics.js", [["getGlobalIntrinsics", [$h‍_a => (getGlobalIntrinsics = $h‍_a)]]]]]);   






const markVirtualizedNativeFunction=  tameFunctionToString();

// @ts-ignore Compartment is definitely on globalThis.
globalThis.Compartment=  makeCompartmentConstructor(
  makeCompartmentConstructor,
  getGlobalIntrinsics(globalThis),
  markVirtualizedNativeFunction);
})()
,
// === functors[52] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let globalThis,assert;$h‍_imports([["./commons.js", [["globalThis", [$h‍_a => (globalThis = $h‍_a)]]]],["./error/assert.js", [["assert", [$h‍_a => (assert = $h‍_a)]]]]]);   


globalThis.assert=  assert;
})()
,
// === functors[53] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   let symbolFor,globalThis,defineCausalConsoleFromLogger,loggedErrorHandler;$h‍_imports([["./commons.js", [["symbolFor", [$h‍_a => (symbolFor = $h‍_a)]],["globalThis", [$h‍_a => (globalThis = $h‍_a)]]]],["./error/console.js", [["defineCausalConsoleFromLogger", [$h‍_a => (defineCausalConsoleFromLogger = $h‍_a)]]]],["./error/assert.js", [["loggedErrorHandler", [$h‍_a => (loggedErrorHandler = $h‍_a)]]]]]);   



// TODO possible additional exports. Some are privileged.
// export { loggedErrorHandler };
// export {
//   makeCausalConsole,
//   consoleLevelMethods,
//   consoleOtherMethods,
//   makeLoggingConsoleKit,
//   filterConsole,
//   pumpLogToConsole,
// } from './src/error/console.js';
// export { assertLogs, throwsAndLogs } from './src/error/throws-and-logs.js';

/**
 * Makes a Console like the
 * [SES causal `console`](https://github.com/endojs/endo/blob/master/packages/ses/src/error/README.md)
 * but whose output is redirected to the supplied `logger` function.
 */
const makeCausalConsoleFromLoggerForSesAva=
  defineCausalConsoleFromLogger(loggedErrorHandler);

/**
 *`makeCausalConsoleFromLoggerForSesAva` is privileged because it exposes
 * unredacted error info onto the `Logger` provided by the caller. It
 * should not be made available to non-privileged code.
 *
 * Further, we consider this particular API choice to be experimental
 * and may change in the future. It is currently only intended for use by
 * `@endo/ses-ava`, with which it will be co-maintained.
 *
 * Thus, this `console-shim.js` makes `makeCausalConsoleFromLoggerForSesAva`
 * available on `globalThis` which it *assumes* is the global of the start
 * compartment and is therefore allowed to hold powers that should not be
 * available in constructed compartments. It makes it available as the value of
 * a global property named by a registered symbol named
 * `MAKE_CAUSAL_CONSOLE_FROM_LOGGER_KEY_FOR_SES_AVA`.
 *
 * Anyone accessing this, including `@endo/ses-ava`, should feature test for
 * this and be tolerant of its absence. It may indeed disappear from later
 * versions of the ses-shim.
 */
const MAKE_CAUSAL_CONSOLE_FROM_LOGGER_KEY_FOR_SES_AVA=  symbolFor(
  'MAKE_CAUSAL_CONSOLE_FROM_LOGGER_KEY_FOR_SES_AVA');


globalThis[MAKE_CAUSAL_CONSOLE_FROM_LOGGER_KEY_FOR_SES_AVA]=
  makeCausalConsoleFromLoggerForSesAva;
})()
,
// === functors[54] ===
({   imports: $h‍_imports,   liveVar: $h‍_live,   onceVar: $h‍_once,   importMeta: $h‍____meta, }) => (function () { 'use strict';   $h‍_imports([["./src/lockdown-shim.js", []],["./src/compartment-shim.js", []],["./src/assert-shim.js", []],["./src/console-shim.js", []]]);   
})()
,
]; // functors end

  const cell = (name, value = undefined) => {
    const observers = [];
    return Object.freeze({
      get: Object.freeze(() => {
        return value;
      }),
      set: Object.freeze((newValue) => {
        value = newValue;
        for (const observe of observers) {
          observe(value);
        }
      }),
      observe: Object.freeze((observe) => {
        observers.push(observe);
        observe(value);
      }),
      enumerable: true,
    });
  };

  const cells = [
    {
      globalThis: cell("globalThis"),
      Array: cell("Array"),
      Date: cell("Date"),
      FinalizationRegistry: cell("FinalizationRegistry"),
      Float32Array: cell("Float32Array"),
      JSON: cell("JSON"),
      Map: cell("Map"),
      Math: cell("Math"),
      Number: cell("Number"),
      Object: cell("Object"),
      Promise: cell("Promise"),
      Proxy: cell("Proxy"),
      Reflect: cell("Reflect"),
      FERAL_REG_EXP: cell("FERAL_REG_EXP"),
      Set: cell("Set"),
      String: cell("String"),
      Symbol: cell("Symbol"),
      WeakMap: cell("WeakMap"),
      WeakSet: cell("WeakSet"),
      FERAL_ERROR: cell("FERAL_ERROR"),
      RangeError: cell("RangeError"),
      ReferenceError: cell("ReferenceError"),
      SyntaxError: cell("SyntaxError"),
      TypeError: cell("TypeError"),
      AggregateError: cell("AggregateError"),
      assign: cell("assign"),
      create: cell("create"),
      defineProperties: cell("defineProperties"),
      entries: cell("entries"),
      freeze: cell("freeze"),
      getOwnPropertyDescriptor: cell("getOwnPropertyDescriptor"),
      getOwnPropertyDescriptors: cell("getOwnPropertyDescriptors"),
      getOwnPropertyNames: cell("getOwnPropertyNames"),
      getPrototypeOf: cell("getPrototypeOf"),
      is: cell("is"),
      isFrozen: cell("isFrozen"),
      isSealed: cell("isSealed"),
      isExtensible: cell("isExtensible"),
      keys: cell("keys"),
      objectPrototype: cell("objectPrototype"),
      seal: cell("seal"),
      preventExtensions: cell("preventExtensions"),
      setPrototypeOf: cell("setPrototypeOf"),
      values: cell("values"),
      fromEntries: cell("fromEntries"),
      speciesSymbol: cell("speciesSymbol"),
      toStringTagSymbol: cell("toStringTagSymbol"),
      iteratorSymbol: cell("iteratorSymbol"),
      matchAllSymbol: cell("matchAllSymbol"),
      unscopablesSymbol: cell("unscopablesSymbol"),
      symbolKeyFor: cell("symbolKeyFor"),
      symbolFor: cell("symbolFor"),
      isInteger: cell("isInteger"),
      stringifyJson: cell("stringifyJson"),
      defineProperty: cell("defineProperty"),
      apply: cell("apply"),
      construct: cell("construct"),
      reflectGet: cell("reflectGet"),
      reflectGetOwnPropertyDescriptor: cell("reflectGetOwnPropertyDescriptor"),
      reflectHas: cell("reflectHas"),
      reflectIsExtensible: cell("reflectIsExtensible"),
      ownKeys: cell("ownKeys"),
      reflectPreventExtensions: cell("reflectPreventExtensions"),
      reflectSet: cell("reflectSet"),
      isArray: cell("isArray"),
      arrayPrototype: cell("arrayPrototype"),
      mapPrototype: cell("mapPrototype"),
      proxyRevocable: cell("proxyRevocable"),
      regexpPrototype: cell("regexpPrototype"),
      setPrototype: cell("setPrototype"),
      stringPrototype: cell("stringPrototype"),
      weakmapPrototype: cell("weakmapPrototype"),
      weaksetPrototype: cell("weaksetPrototype"),
      functionPrototype: cell("functionPrototype"),
      promisePrototype: cell("promisePrototype"),
      generatorPrototype: cell("generatorPrototype"),
      typedArrayPrototype: cell("typedArrayPrototype"),
      uncurryThis: cell("uncurryThis"),
      objectHasOwnProperty: cell("objectHasOwnProperty"),
      arrayFilter: cell("arrayFilter"),
      arrayForEach: cell("arrayForEach"),
      arrayIncludes: cell("arrayIncludes"),
      arrayJoin: cell("arrayJoin"),
      arrayMap: cell("arrayMap"),
      arrayFlatMap: cell("arrayFlatMap"),
      arrayPop: cell("arrayPop"),
      arrayPush: cell("arrayPush"),
      arraySlice: cell("arraySlice"),
      arraySome: cell("arraySome"),
      arraySort: cell("arraySort"),
      iterateArray: cell("iterateArray"),
      mapSet: cell("mapSet"),
      mapGet: cell("mapGet"),
      mapHas: cell("mapHas"),
      mapDelete: cell("mapDelete"),
      mapEntries: cell("mapEntries"),
      iterateMap: cell("iterateMap"),
      setAdd: cell("setAdd"),
      setDelete: cell("setDelete"),
      setForEach: cell("setForEach"),
      setHas: cell("setHas"),
      iterateSet: cell("iterateSet"),
      regexpTest: cell("regexpTest"),
      regexpExec: cell("regexpExec"),
      matchAllRegExp: cell("matchAllRegExp"),
      stringEndsWith: cell("stringEndsWith"),
      stringIncludes: cell("stringIncludes"),
      stringIndexOf: cell("stringIndexOf"),
      stringMatch: cell("stringMatch"),
      generatorNext: cell("generatorNext"),
      generatorThrow: cell("generatorThrow"),
      stringReplace: cell("stringReplace"),
      stringSearch: cell("stringSearch"),
      stringSlice: cell("stringSlice"),
      stringSplit: cell("stringSplit"),
      stringStartsWith: cell("stringStartsWith"),
      iterateString: cell("iterateString"),
      weakmapDelete: cell("weakmapDelete"),
      weakmapGet: cell("weakmapGet"),
      weakmapHas: cell("weakmapHas"),
      weakmapSet: cell("weakmapSet"),
      weaksetAdd: cell("weaksetAdd"),
      weaksetHas: cell("weaksetHas"),
      functionToString: cell("functionToString"),
      functionBind: cell("functionBind"),
      promiseAll: cell("promiseAll"),
      promiseCatch: cell("promiseCatch"),
      promiseThen: cell("promiseThen"),
      finalizationRegistryRegister: cell("finalizationRegistryRegister"),
      finalizationRegistryUnregister: cell("finalizationRegistryUnregister"),
      getConstructorOf: cell("getConstructorOf"),
      immutableObject: cell("immutableObject"),
      isObject: cell("isObject"),
      isError: cell("isError"),
      FERAL_EVAL: cell("FERAL_EVAL"),
      FERAL_FUNCTION: cell("FERAL_FUNCTION"),
      noEvalEvaluate: cell("noEvalEvaluate"),
      FERAL_STACK_GETTER: cell("FERAL_STACK_GETTER"),
      FERAL_STACK_SETTER: cell("FERAL_STACK_SETTER"),
    },
    {
    },
    {
      makeEnvironmentCaptor: cell("makeEnvironmentCaptor"),
      getEnvironmentOption: cell("getEnvironmentOption"),
      getEnvironmentOptionsList: cell("getEnvironmentOptionsList"),
      environmentOptionsListHas: cell("environmentOptionsListHas"),
    },
    {
    },
    {
      an: cell("an"),
      bestEffortStringify: cell("bestEffortStringify"),
      enJoin: cell("enJoin"),
    },
    {
    },
    {
    },
    {
      makeLRUCacheMap: cell("makeLRUCacheMap"),
    },
    {
      makeNoteLogArgsArrayKit: cell("makeNoteLogArgsArrayKit"),
    },
    {
      unredactedDetails: cell("unredactedDetails"),
      loggedErrorHandler: cell("loggedErrorHandler"),
      makeAssert: cell("makeAssert"),
      assert: cell("assert"),
      sanitizeError: cell("sanitizeError"),
    },
    {
      isTypedArray: cell("isTypedArray"),
      makeHardener: cell("makeHardener"),
    },
    {
      NativeErrors: cell("NativeErrors"),
      constantProperties: cell("constantProperties"),
      universalPropertyNames: cell("universalPropertyNames"),
      initialGlobalPropertyNames: cell("initialGlobalPropertyNames"),
      sharedGlobalPropertyNames: cell("sharedGlobalPropertyNames"),
      uniqueGlobalPropertyNames: cell("uniqueGlobalPropertyNames"),
      FunctionInstance: cell("FunctionInstance"),
      AsyncFunctionInstance: cell("AsyncFunctionInstance"),
      isAccessorPermit: cell("isAccessorPermit"),
      permitted: cell("permitted"),
    },
    {
      makeIntrinsicsCollector: cell("makeIntrinsicsCollector"),
      getGlobalIntrinsics: cell("getGlobalIntrinsics"),
    },
    {
      default: cell("default"),
    },
    {
      default: cell("default"),
    },
    {
      default: cell("default"),
    },
    {
      default: cell("default"),
    },
    {
      default: cell("default"),
    },
    {
      minEnablements: cell("minEnablements"),
      moderateEnablements: cell("moderateEnablements"),
      severeEnablements: cell("severeEnablements"),
    },
    {
      default: cell("default"),
    },
    {
      default: cell("default"),
    },
    {
      makeEvalFunction: cell("makeEvalFunction"),
    },
    {
      makeFunctionConstructor: cell("makeFunctionConstructor"),
    },
    {
      setGlobalObjectSymbolUnscopables: cell("setGlobalObjectSymbolUnscopables"),
      setGlobalObjectConstantProperties: cell("setGlobalObjectConstantProperties"),
      setGlobalObjectMutableProperties: cell("setGlobalObjectMutableProperties"),
      setGlobalObjectEvaluators: cell("setGlobalObjectEvaluators"),
    },
    {
      alwaysThrowHandler: cell("alwaysThrowHandler"),
      strictScopeTerminatorHandler: cell("strictScopeTerminatorHandler"),
      strictScopeTerminator: cell("strictScopeTerminator"),
    },
    {
      createSloppyGlobalsScopeTerminator: cell("createSloppyGlobalsScopeTerminator"),
    },
    {
      makeEvalScopeKit: cell("makeEvalScopeKit"),
    },
    {
      getSourceURL: cell("getSourceURL"),
    },
    {
      rejectHtmlComments: cell("rejectHtmlComments"),
      evadeHtmlCommentTest: cell("evadeHtmlCommentTest"),
      rejectImportExpressions: cell("rejectImportExpressions"),
      evadeImportExpressionTest: cell("evadeImportExpressionTest"),
      rejectSomeDirectEvalExpressions: cell("rejectSomeDirectEvalExpressions"),
      mandatoryTransforms: cell("mandatoryTransforms"),
      applyTransforms: cell("applyTransforms"),
      transforms: cell("transforms"),
    },
    {
      isValidIdentifierName: cell("isValidIdentifierName"),
      getScopeConstants: cell("getScopeConstants"),
    },
    {
      makeEvaluate: cell("makeEvaluate"),
    },
    {
      makeSafeEvaluator: cell("makeSafeEvaluator"),
    },
    {
      tameFunctionToString: cell("tameFunctionToString"),
    },
    {
      tameDomains: cell("tameDomains"),
    },
    {
      consoleLevelMethods: cell("consoleLevelMethods"),
      consoleOtherMethods: cell("consoleOtherMethods"),
      makeLoggingConsoleKit: cell("makeLoggingConsoleKit"),
      pumpLogToConsole: cell("pumpLogToConsole"),
      makeCausalConsole: cell("makeCausalConsole"),
      defineCausalConsoleFromLogger: cell("defineCausalConsoleFromLogger"),
      filterConsole: cell("filterConsole"),
    },
    {
      makeRejectionHandlers: cell("makeRejectionHandlers"),
    },
    {
      tameConsole: cell("tameConsole"),
    },
    {
      filterFileName: cell("filterFileName"),
      shortenCallSiteString: cell("shortenCallSiteString"),
      tameV8ErrorConstructor: cell("tameV8ErrorConstructor"),
    },
    {
      default: cell("default"),
    },
    {
      makeAlias: cell("makeAlias"),
      load: cell("load"),
      loadNow: cell("loadNow"),
    },
    {
      deferExports: cell("deferExports"),
      getDeferredExports: cell("getDeferredExports"),
    },
    {
      provideCompartmentEvaluator: cell("provideCompartmentEvaluator"),
      compartmentEvaluate: cell("compartmentEvaluate"),
    },
    {
      makeThirdPartyModuleInstance: cell("makeThirdPartyModuleInstance"),
      makeModuleInstance: cell("makeModuleInstance"),
    },
    {
      link: cell("link"),
      instantiate: cell("instantiate"),
    },
    {
      InertCompartment: cell("InertCompartment"),
      CompartmentPrototype: cell("CompartmentPrototype"),
      makeCompartmentConstructor: cell("makeCompartmentConstructor"),
    },
    {
      getAnonymousIntrinsics: cell("getAnonymousIntrinsics"),
    },
    {
      tameHarden: cell("tameHarden"),
    },
    {
      tameSymbolConstructor: cell("tameSymbolConstructor"),
    },
    {
      tameFauxDataProperty: cell("tameFauxDataProperty"),
      tameFauxDataProperties: cell("tameFauxDataProperties"),
    },
    {
      repairIntrinsics: cell("repairIntrinsics"),
    },
    {
    },
    {
    },
    {
    },
    {
    },
    {
    },
  ];

  Object.defineProperties(cells[3], Object.getOwnPropertyDescriptors(cells[2]));

const namespaces = cells.map(cells => Object.freeze(Object.create(null, {
    ...cells,
    // Make this appear like an ESM module namespace object.
    [Symbol.toStringTag]: {
      value: 'Module',
      writable: false,
      enumerable: false,
      configurable: false,
    },
  })));

  for (let index = 0; index < namespaces.length; index += 1) {
    cells[index]['*'] = cell('*', namespaces[index]);
  }

function observeImports(map, importName, importIndex) {
  for (const [name, observers] of map.get(importName)) {
    const cell = cells[importIndex][name];
    if (cell === undefined) {
      throw new ReferenceError(`Cannot import name ${name}`);
    }
    for (const observer of observers) {
      cell.observe(observer);
    }
  }
}


  functors[0]({
    imports(entries) {
      const map = new Map(entries);
    },
    liveVar: {
    },
    onceVar: {
      universalThis: cells[0].globalThis.set,
      Array: cells[0].Array.set,
      Date: cells[0].Date.set,
      FinalizationRegistry: cells[0].FinalizationRegistry.set,
      Float32Array: cells[0].Float32Array.set,
      JSON: cells[0].JSON.set,
      Map: cells[0].Map.set,
      Math: cells[0].Math.set,
      Number: cells[0].Number.set,
      Object: cells[0].Object.set,
      Promise: cells[0].Promise.set,
      Proxy: cells[0].Proxy.set,
      Reflect: cells[0].Reflect.set,
      FERAL_REG_EXP: cells[0].FERAL_REG_EXP.set,
      Set: cells[0].Set.set,
      String: cells[0].String.set,
      Symbol: cells[0].Symbol.set,
      WeakMap: cells[0].WeakMap.set,
      WeakSet: cells[0].WeakSet.set,
      FERAL_ERROR: cells[0].FERAL_ERROR.set,
      RangeError: cells[0].RangeError.set,
      ReferenceError: cells[0].ReferenceError.set,
      SyntaxError: cells[0].SyntaxError.set,
      TypeError: cells[0].TypeError.set,
      AggregateError: cells[0].AggregateError.set,
      assign: cells[0].assign.set,
      create: cells[0].create.set,
      defineProperties: cells[0].defineProperties.set,
      entries: cells[0].entries.set,
      freeze: cells[0].freeze.set,
      getOwnPropertyDescriptor: cells[0].getOwnPropertyDescriptor.set,
      getOwnPropertyDescriptors: cells[0].getOwnPropertyDescriptors.set,
      getOwnPropertyNames: cells[0].getOwnPropertyNames.set,
      getPrototypeOf: cells[0].getPrototypeOf.set,
      is: cells[0].is.set,
      isFrozen: cells[0].isFrozen.set,
      isSealed: cells[0].isSealed.set,
      isExtensible: cells[0].isExtensible.set,
      keys: cells[0].keys.set,
      objectPrototype: cells[0].objectPrototype.set,
      seal: cells[0].seal.set,
      preventExtensions: cells[0].preventExtensions.set,
      setPrototypeOf: cells[0].setPrototypeOf.set,
      values: cells[0].values.set,
      fromEntries: cells[0].fromEntries.set,
      speciesSymbol: cells[0].speciesSymbol.set,
      toStringTagSymbol: cells[0].toStringTagSymbol.set,
      iteratorSymbol: cells[0].iteratorSymbol.set,
      matchAllSymbol: cells[0].matchAllSymbol.set,
      unscopablesSymbol: cells[0].unscopablesSymbol.set,
      symbolKeyFor: cells[0].symbolKeyFor.set,
      symbolFor: cells[0].symbolFor.set,
      isInteger: cells[0].isInteger.set,
      stringifyJson: cells[0].stringifyJson.set,
      defineProperty: cells[0].defineProperty.set,
      apply: cells[0].apply.set,
      construct: cells[0].construct.set,
      reflectGet: cells[0].reflectGet.set,
      reflectGetOwnPropertyDescriptor: cells[0].reflectGetOwnPropertyDescriptor.set,
      reflectHas: cells[0].reflectHas.set,
      reflectIsExtensible: cells[0].reflectIsExtensible.set,
      ownKeys: cells[0].ownKeys.set,
      reflectPreventExtensions: cells[0].reflectPreventExtensions.set,
      reflectSet: cells[0].reflectSet.set,
      isArray: cells[0].isArray.set,
      arrayPrototype: cells[0].arrayPrototype.set,
      mapPrototype: cells[0].mapPrototype.set,
      proxyRevocable: cells[0].proxyRevocable.set,
      regexpPrototype: cells[0].regexpPrototype.set,
      setPrototype: cells[0].setPrototype.set,
      stringPrototype: cells[0].stringPrototype.set,
      weakmapPrototype: cells[0].weakmapPrototype.set,
      weaksetPrototype: cells[0].weaksetPrototype.set,
      functionPrototype: cells[0].functionPrototype.set,
      promisePrototype: cells[0].promisePrototype.set,
      generatorPrototype: cells[0].generatorPrototype.set,
      typedArrayPrototype: cells[0].typedArrayPrototype.set,
      uncurryThis: cells[0].uncurryThis.set,
      objectHasOwnProperty: cells[0].objectHasOwnProperty.set,
      arrayFilter: cells[0].arrayFilter.set,
      arrayForEach: cells[0].arrayForEach.set,
      arrayIncludes: cells[0].arrayIncludes.set,
      arrayJoin: cells[0].arrayJoin.set,
      arrayMap: cells[0].arrayMap.set,
      arrayFlatMap: cells[0].arrayFlatMap.set,
      arrayPop: cells[0].arrayPop.set,
      arrayPush: cells[0].arrayPush.set,
      arraySlice: cells[0].arraySlice.set,
      arraySome: cells[0].arraySome.set,
      arraySort: cells[0].arraySort.set,
      iterateArray: cells[0].iterateArray.set,
      mapSet: cells[0].mapSet.set,
      mapGet: cells[0].mapGet.set,
      mapHas: cells[0].mapHas.set,
      mapDelete: cells[0].mapDelete.set,
      mapEntries: cells[0].mapEntries.set,
      iterateMap: cells[0].iterateMap.set,
      setAdd: cells[0].setAdd.set,
      setDelete: cells[0].setDelete.set,
      setForEach: cells[0].setForEach.set,
      setHas: cells[0].setHas.set,
      iterateSet: cells[0].iterateSet.set,
      regexpTest: cells[0].regexpTest.set,
      regexpExec: cells[0].regexpExec.set,
      matchAllRegExp: cells[0].matchAllRegExp.set,
      stringEndsWith: cells[0].stringEndsWith.set,
      stringIncludes: cells[0].stringIncludes.set,
      stringIndexOf: cells[0].stringIndexOf.set,
      stringMatch: cells[0].stringMatch.set,
      generatorNext: cells[0].generatorNext.set,
      generatorThrow: cells[0].generatorThrow.set,
      stringReplace: cells[0].stringReplace.set,
      stringSearch: cells[0].stringSearch.set,
      stringSlice: cells[0].stringSlice.set,
      stringSplit: cells[0].stringSplit.set,
      stringStartsWith: cells[0].stringStartsWith.set,
      iterateString: cells[0].iterateString.set,
      weakmapDelete: cells[0].weakmapDelete.set,
      weakmapGet: cells[0].weakmapGet.set,
      weakmapHas: cells[0].weakmapHas.set,
      weakmapSet: cells[0].weakmapSet.set,
      weaksetAdd: cells[0].weaksetAdd.set,
      weaksetHas: cells[0].weaksetHas.set,
      functionToString: cells[0].functionToString.set,
      functionBind: cells[0].functionBind.set,
      promiseAll: cells[0].promiseAll.set,
      promiseCatch: cells[0].promiseCatch.set,
      promiseThen: cells[0].promiseThen.set,
      finalizationRegistryRegister: cells[0].finalizationRegistryRegister.set,
      finalizationRegistryUnregister: cells[0].finalizationRegistryUnregister.set,
      getConstructorOf: cells[0].getConstructorOf.set,
      immutableObject: cells[0].immutableObject.set,
      isObject: cells[0].isObject.set,
      isError: cells[0].isError.set,
      FERAL_EVAL: cells[0].FERAL_EVAL.set,
      FERAL_FUNCTION: cells[0].FERAL_FUNCTION.set,
      noEvalEvaluate: cells[0].noEvalEvaluate.set,
      FERAL_STACK_GETTER: cells[0].FERAL_STACK_GETTER.set,
      FERAL_STACK_SETTER: cells[0].FERAL_STACK_SETTER.set,
    },
    importMeta: {},
  });
  functors[1]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
    },
    liveVar: {
    },
    onceVar: {
    },
    importMeta: {},
  });
  functors[2]({
    imports(entries) {
      const map = new Map(entries);
    },
    liveVar: {
    },
    onceVar: {
      makeEnvironmentCaptor: cells[2].makeEnvironmentCaptor.set,
      getEnvironmentOption: cells[2].getEnvironmentOption.set,
      getEnvironmentOptionsList: cells[2].getEnvironmentOptionsList.set,
      environmentOptionsListHas: cells[2].environmentOptionsListHas.set,
    },
    importMeta: {},
  });
  functors[3]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./src/env-options.js", 2);
    },
    liveVar: {
    },
    onceVar: {
    },
    importMeta: {},
  });
  functors[4]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "../commons.js", 0);
    },
    liveVar: {
    },
    onceVar: {
      an: cells[4].an.set,
      bestEffortStringify: cells[4].bestEffortStringify.set,
      enJoin: cells[4].enJoin.set,
    },
    importMeta: {},
  });
  functors[5]({
    imports(entries) {
      const map = new Map(entries);
    },
    liveVar: {
    },
    onceVar: {
    },
    importMeta: {},
  });
  functors[6]({
    imports(entries) {
      const map = new Map(entries);
    },
    liveVar: {
    },
    onceVar: {
    },
    importMeta: {},
  });
  functors[7]({
    imports(entries) {
      const map = new Map(entries);
    },
    liveVar: {
    },
    onceVar: {
      makeLRUCacheMap: cells[7].makeLRUCacheMap.set,
    },
    importMeta: {},
  });
  functors[8]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "../make-lru-cachemap.js", 7);
      observeImports(map, "./internal-types.js", 6);
    },
    liveVar: {
    },
    onceVar: {
      makeNoteLogArgsArrayKit: cells[8].makeNoteLogArgsArrayKit.set,
    },
    importMeta: {},
  });
  functors[9]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "../commons.js", 0);
      observeImports(map, "./stringify-utils.js", 4);
      observeImports(map, "./types.js", 5);
      observeImports(map, "./internal-types.js", 6);
      observeImports(map, "./note-log-args.js", 8);
    },
    liveVar: {
    },
    onceVar: {
      unredactedDetails: cells[9].unredactedDetails.set,
      loggedErrorHandler: cells[9].loggedErrorHandler.set,
      makeAssert: cells[9].makeAssert.set,
      assert: cells[9].assert.set,
      sanitizeError: cells[9].sanitizeError.set,
    },
    importMeta: {},
  });
  functors[10]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
      observeImports(map, "./error/assert.js", 9);
    },
    liveVar: {
    },
    onceVar: {
      isTypedArray: cells[10].isTypedArray.set,
      makeHardener: cells[10].makeHardener.set,
    },
    importMeta: {},
  });
  functors[11]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
    },
    liveVar: {
    },
    onceVar: {
      NativeErrors: cells[11].NativeErrors.set,
      constantProperties: cells[11].constantProperties.set,
      universalPropertyNames: cells[11].universalPropertyNames.set,
      initialGlobalPropertyNames: cells[11].initialGlobalPropertyNames.set,
      sharedGlobalPropertyNames: cells[11].sharedGlobalPropertyNames.set,
      uniqueGlobalPropertyNames: cells[11].uniqueGlobalPropertyNames.set,
      FunctionInstance: cells[11].FunctionInstance.set,
      AsyncFunctionInstance: cells[11].AsyncFunctionInstance.set,
      isAccessorPermit: cells[11].isAccessorPermit.set,
      permitted: cells[11].permitted.set,
    },
    importMeta: {},
  });
  functors[12]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
      observeImports(map, "./permits.js", 11);
    },
    liveVar: {
    },
    onceVar: {
      makeIntrinsicsCollector: cells[12].makeIntrinsicsCollector.set,
      getGlobalIntrinsics: cells[12].getGlobalIntrinsics.set,
    },
    importMeta: {},
  });
  functors[13]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./permits.js", 11);
      observeImports(map, "./commons.js", 0);
    },
    liveVar: {
    },
    onceVar: {
      default: cells[13].default.set,
    },
    importMeta: {},
  });
  functors[14]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
    },
    liveVar: {
    },
    onceVar: {
      default: cells[14].default.set,
    },
    importMeta: {},
  });
  functors[15]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
    },
    liveVar: {
    },
    onceVar: {
      default: cells[15].default.set,
    },
    importMeta: {},
  });
  functors[16]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
    },
    liveVar: {
    },
    onceVar: {
      default: cells[16].default.set,
    },
    importMeta: {},
  });
  functors[17]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
    },
    liveVar: {
    },
    onceVar: {
      default: cells[17].default.set,
    },
    importMeta: {},
  });
  functors[18]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
    },
    liveVar: {
    },
    onceVar: {
      minEnablements: cells[18].minEnablements.set,
      moderateEnablements: cells[18].moderateEnablements.set,
      severeEnablements: cells[18].severeEnablements.set,
    },
    importMeta: {},
  });
  functors[19]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
      observeImports(map, "./enablements.js", 18);
    },
    liveVar: {
    },
    onceVar: {
      default: cells[19].default.set,
    },
    importMeta: {},
  });
  functors[20]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
      observeImports(map, "./error/assert.js", 9);
    },
    liveVar: {
    },
    onceVar: {
      default: cells[20].default.set,
    },
    importMeta: {},
  });
  functors[21]({
    imports(entries) {
      const map = new Map(entries);
    },
    liveVar: {
    },
    onceVar: {
      makeEvalFunction: cells[21].makeEvalFunction.set,
    },
    importMeta: {},
  });
  functors[22]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
      observeImports(map, "./error/assert.js", 9);
    },
    liveVar: {
    },
    onceVar: {
      makeFunctionConstructor: cells[22].makeFunctionConstructor.set,
    },
    importMeta: {},
  });
  functors[23]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
      observeImports(map, "./make-eval-function.js", 21);
      observeImports(map, "./make-function-constructor.js", 22);
      observeImports(map, "./permits.js", 11);
    },
    liveVar: {
    },
    onceVar: {
      setGlobalObjectSymbolUnscopables: cells[23].setGlobalObjectSymbolUnscopables.set,
      setGlobalObjectConstantProperties: cells[23].setGlobalObjectConstantProperties.set,
      setGlobalObjectMutableProperties: cells[23].setGlobalObjectMutableProperties.set,
      setGlobalObjectEvaluators: cells[23].setGlobalObjectEvaluators.set,
    },
    importMeta: {},
  });
  functors[24]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
      observeImports(map, "./error/assert.js", 9);
    },
    liveVar: {
    },
    onceVar: {
      alwaysThrowHandler: cells[24].alwaysThrowHandler.set,
      strictScopeTerminatorHandler: cells[24].strictScopeTerminatorHandler.set,
      strictScopeTerminator: cells[24].strictScopeTerminator.set,
    },
    importMeta: {},
  });
  functors[25]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
      observeImports(map, "./strict-scope-terminator.js", 24);
    },
    liveVar: {
    },
    onceVar: {
      createSloppyGlobalsScopeTerminator: cells[25].createSloppyGlobalsScopeTerminator.set,
    },
    importMeta: {},
  });
  functors[26]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
      observeImports(map, "./error/assert.js", 9);
    },
    liveVar: {
    },
    onceVar: {
      makeEvalScopeKit: cells[26].makeEvalScopeKit.set,
    },
    importMeta: {},
  });
  functors[27]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
    },
    liveVar: {
    },
    onceVar: {
      getSourceURL: cells[27].getSourceURL.set,
    },
    importMeta: {},
  });
  functors[28]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
      observeImports(map, "./get-source-url.js", 27);
    },
    liveVar: {
    },
    onceVar: {
      rejectHtmlComments: cells[28].rejectHtmlComments.set,
      evadeHtmlCommentTest: cells[28].evadeHtmlCommentTest.set,
      rejectImportExpressions: cells[28].rejectImportExpressions.set,
      evadeImportExpressionTest: cells[28].evadeImportExpressionTest.set,
      rejectSomeDirectEvalExpressions: cells[28].rejectSomeDirectEvalExpressions.set,
      mandatoryTransforms: cells[28].mandatoryTransforms.set,
      applyTransforms: cells[28].applyTransforms.set,
      transforms: cells[28].transforms.set,
    },
    importMeta: {},
  });
  functors[29]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
    },
    liveVar: {
    },
    onceVar: {
      isValidIdentifierName: cells[29].isValidIdentifierName.set,
      getScopeConstants: cells[29].getScopeConstants.set,
    },
    importMeta: {},
  });
  functors[30]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
      observeImports(map, "./scope-constants.js", 29);
    },
    liveVar: {
    },
    onceVar: {
      makeEvaluate: cells[30].makeEvaluate.set,
    },
    importMeta: {},
  });
  functors[31]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
      observeImports(map, "./strict-scope-terminator.js", 24);
      observeImports(map, "./sloppy-globals-scope-terminator.js", 25);
      observeImports(map, "./eval-scope.js", 26);
      observeImports(map, "./transforms.js", 28);
      observeImports(map, "./make-evaluate.js", 30);
      observeImports(map, "./error/assert.js", 9);
    },
    liveVar: {
    },
    onceVar: {
      makeSafeEvaluator: cells[31].makeSafeEvaluator.set,
    },
    importMeta: {},
  });
  functors[32]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
    },
    liveVar: {
    },
    onceVar: {
      tameFunctionToString: cells[32].tameFunctionToString.set,
    },
    importMeta: {},
  });
  functors[33]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
    },
    liveVar: {
    },
    onceVar: {
      tameDomains: cells[33].tameDomains.set,
    },
    importMeta: {},
  });
  functors[34]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "../commons.js", 0);
      observeImports(map, "./types.js", 5);
      observeImports(map, "./internal-types.js", 6);
    },
    liveVar: {
    },
    onceVar: {
      consoleLevelMethods: cells[34].consoleLevelMethods.set,
      consoleOtherMethods: cells[34].consoleOtherMethods.set,
      makeLoggingConsoleKit: cells[34].makeLoggingConsoleKit.set,
      pumpLogToConsole: cells[34].pumpLogToConsole.set,
      makeCausalConsole: cells[34].makeCausalConsole.set,
      defineCausalConsoleFromLogger: cells[34].defineCausalConsoleFromLogger.set,
      filterConsole: cells[34].filterConsole.set,
    },
    importMeta: {},
  });
  functors[35]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "../commons.js", 0);
    },
    liveVar: {
    },
    onceVar: {
      makeRejectionHandlers: cells[35].makeRejectionHandlers.set,
    },
    importMeta: {},
  });
  functors[36]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "../commons.js", 0);
      observeImports(map, "./assert.js", 9);
      observeImports(map, "./console.js", 34);
      observeImports(map, "./unhandled-rejection.js", 35);
      observeImports(map, "./types.js", 5);
      observeImports(map, "./internal-types.js", 6);
    },
    liveVar: {
    },
    onceVar: {
      tameConsole: cells[36].tameConsole.set,
    },
    importMeta: {},
  });
  functors[37]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "../commons.js", 0);
    },
    liveVar: {
    },
    onceVar: {
      filterFileName: cells[37].filterFileName.set,
      shortenCallSiteString: cells[37].shortenCallSiteString.set,
      tameV8ErrorConstructor: cells[37].tameV8ErrorConstructor.set,
    },
    importMeta: {},
  });
  functors[38]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "../commons.js", 0);
      observeImports(map, "../permits.js", 11);
      observeImports(map, "./tame-v8-error-constructor.js", 37);
    },
    liveVar: {
    },
    onceVar: {
      default: cells[38].default.set,
    },
    importMeta: {},
  });
  functors[39]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "@endo/env-options", 3);
      observeImports(map, "./commons.js", 0);
      observeImports(map, "./error/assert.js", 9);
    },
    liveVar: {
    },
    onceVar: {
      makeAlias: cells[39].makeAlias.set,
      load: cells[39].load.set,
      loadNow: cells[39].loadNow.set,
    },
    importMeta: {},
  });
  functors[40]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./module-load.js", 39);
      observeImports(map, "./commons.js", 0);
      observeImports(map, "./error/assert.js", 9);
    },
    liveVar: {
    },
    onceVar: {
      deferExports: cells[40].deferExports.set,
      getDeferredExports: cells[40].getDeferredExports.set,
    },
    importMeta: {},
  });
  functors[41]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
      observeImports(map, "./transforms.js", 28);
      observeImports(map, "./make-safe-evaluator.js", 31);
    },
    liveVar: {
    },
    onceVar: {
      provideCompartmentEvaluator: cells[41].provideCompartmentEvaluator.set,
      compartmentEvaluate: cells[41].compartmentEvaluate.set,
    },
    importMeta: {},
  });
  functors[42]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./error/assert.js", 9);
      observeImports(map, "./module-proxy.js", 40);
      observeImports(map, "./commons.js", 0);
      observeImports(map, "./compartment-evaluate.js", 41);
    },
    liveVar: {
    },
    onceVar: {
      makeThirdPartyModuleInstance: cells[42].makeThirdPartyModuleInstance.set,
      makeModuleInstance: cells[42].makeModuleInstance.set,
    },
    importMeta: {},
  });
  functors[43]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./error/assert.js", 9);
      observeImports(map, "./module-instance.js", 42);
      observeImports(map, "./commons.js", 0);
    },
    liveVar: {
    },
    onceVar: {
      link: cells[43].link.set,
      instantiate: cells[43].instantiate.set,
    },
    importMeta: {},
  });
  functors[44]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
      observeImports(map, "./global-object.js", 23);
      observeImports(map, "./permits.js", 11);
      observeImports(map, "./module-load.js", 39);
      observeImports(map, "./module-link.js", 43);
      observeImports(map, "./module-proxy.js", 40);
      observeImports(map, "./error/assert.js", 9);
      observeImports(map, "./compartment-evaluate.js", 41);
      observeImports(map, "./make-safe-evaluator.js", 31);
    },
    liveVar: {
    },
    onceVar: {
      InertCompartment: cells[44].InertCompartment.set,
      CompartmentPrototype: cells[44].CompartmentPrototype.set,
      makeCompartmentConstructor: cells[44].makeCompartmentConstructor.set,
    },
    importMeta: {},
  });
  functors[45]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
      observeImports(map, "./compartment.js", 44);
    },
    liveVar: {
    },
    onceVar: {
      getAnonymousIntrinsics: cells[45].getAnonymousIntrinsics.set,
    },
    importMeta: {},
  });
  functors[46]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
    },
    liveVar: {
    },
    onceVar: {
      tameHarden: cells[46].tameHarden.set,
    },
    importMeta: {},
  });
  functors[47]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
    },
    liveVar: {
    },
    onceVar: {
      tameSymbolConstructor: cells[47].tameSymbolConstructor.set,
    },
    importMeta: {},
  });
  functors[48]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
    },
    liveVar: {
    },
    onceVar: {
      tameFauxDataProperty: cells[48].tameFauxDataProperty.set,
      tameFauxDataProperties: cells[48].tameFauxDataProperties.set,
    },
    importMeta: {},
  });
  functors[49]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "@endo/env-options", 3);
      observeImports(map, "./commons.js", 0);
      observeImports(map, "./make-hardener.js", 10);
      observeImports(map, "./intrinsics.js", 12);
      observeImports(map, "./permits-intrinsics.js", 13);
      observeImports(map, "./tame-function-constructors.js", 14);
      observeImports(map, "./tame-date-constructor.js", 15);
      observeImports(map, "./tame-math-object.js", 16);
      observeImports(map, "./tame-regexp-constructor.js", 17);
      observeImports(map, "./enable-property-overrides.js", 19);
      observeImports(map, "./tame-locale-methods.js", 20);
      observeImports(map, "./global-object.js", 23);
      observeImports(map, "./make-safe-evaluator.js", 31);
      observeImports(map, "./permits.js", 11);
      observeImports(map, "./tame-function-tostring.js", 32);
      observeImports(map, "./tame-domains.js", 33);
      observeImports(map, "./error/tame-console.js", 36);
      observeImports(map, "./error/tame-error-constructor.js", 38);
      observeImports(map, "./error/assert.js", 9);
      observeImports(map, "./get-anonymous-intrinsics.js", 45);
      observeImports(map, "./compartment.js", 44);
      observeImports(map, "./tame-harden.js", 46);
      observeImports(map, "./tame-symbol-constructor.js", 47);
      observeImports(map, "./tame-faux-data-properties.js", 48);
    },
    liveVar: {
    },
    onceVar: {
      repairIntrinsics: cells[49].repairIntrinsics.set,
    },
    importMeta: {},
  });
  functors[50]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./assert-sloppy-mode.js", 1);
      observeImports(map, "./commons.js", 0);
      observeImports(map, "./lockdown.js", 49);
    },
    liveVar: {
    },
    onceVar: {
    },
    importMeta: {},
  });
  functors[51]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
      observeImports(map, "./compartment.js", 44);
      observeImports(map, "./tame-function-tostring.js", 32);
      observeImports(map, "./intrinsics.js", 12);
    },
    liveVar: {
    },
    onceVar: {
    },
    importMeta: {},
  });
  functors[52]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
      observeImports(map, "./error/assert.js", 9);
    },
    liveVar: {
    },
    onceVar: {
    },
    importMeta: {},
  });
  functors[53]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./commons.js", 0);
      observeImports(map, "./error/console.js", 34);
      observeImports(map, "./error/assert.js", 9);
    },
    liveVar: {
    },
    onceVar: {
    },
    importMeta: {},
  });
  functors[54]({
    imports(entries) {
      const map = new Map(entries);
      observeImports(map, "./src/lockdown-shim.js", 50);
      observeImports(map, "./src/compartment-shim.js", 51);
      observeImports(map, "./src/assert-shim.js", 52);
      observeImports(map, "./src/console-shim.js", 53);
    },
    liveVar: {
    },
    onceVar: {
    },
    importMeta: {},
  });

  return cells[cells.length - 1]['*'].get();
})();
