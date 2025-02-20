# Description

The Engine singleton is the core of the MetaMask Mobile app. It is responsible for initializing and managing all controllers.

# How to integrate a new controller

- Create a messenger callback function for creating the controller's messenger

  - The function will be used to get the controller's messenger during the initialization of the controller
  - It should exist in the `Engine/messengers` folder and follow the pattern of existing controllers such as `Engine/messengers/accounts-controller-messenger`
  - The callback should return a restricted controller messenger with the appropriate allowed events and actions
  - Add the controller name to the union type `ControllersToInitialize` in `Engine/types.ts`
  - Add the controller entry to `CONTROLLER_MESSENGERS` in `Engine/messengers/index.ts`

- Create an initialization function for the controller

  - This function will be used to initialize the controller
  - It should exist in the `Engine/controllers` folder and follow the pattern of existing controllers such as `Engine/controllers/accounts-controller`
  - The initialization function should return an object with a `controller` property that is the controller instance
  - Import the initialization function in `Engine.ts` and add it to the `controllerInitFunctions` object when calling `initModularizedControllers`

- Enable listening to the controller's state change event

  - This state change event is responsible for propagating the controller's state to Redux
  - Add the controller's state change event name to `BACKGROUND_STATE_CHANGE_EVENT_NAMES` in `Engine/constants.ts`

- Add the controller to the Engine's context

  - This allows the controller to be accessed via `Engine.context` when imported in other files
  - Add the controller entry to the object that `this.context` is initially set to

- Assign files to CODEOWNERS
  - Add both `app/core/Engine/controllers/<example-controller>` and `app/core/Engine/messengers/<example-controller-messenger>` to the `CODEOWNERS` file and assign to them to the appropriate team
