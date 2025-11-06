import { Client } from "webdriver";

declare global {
    type AppiumElementRef = {
      ELEMENT?: string;
      'element-6066-11e4-a52e-4f735466cecf'?: string;
    };
  
    // Widen DetoxElement so PO getters can keep returning DetoxElement
    type CrossElement = DetoxElement | Promise<AppiumElementRef>;

    type driver = Client;
  }
  export {};