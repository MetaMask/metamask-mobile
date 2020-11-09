//
//  WidgetHelper.swift
//  MetaMask
//
//  Created by Andre Pimenta on 09/11/2020.
//  Copyright © 2020 MetaMask. All rights reserved.
//

import WidgetKit

@available(iOS 14.0, *)
@objcMembers final class WidgetKitHelper: NSObject {

      class func reloadAllWidgets(){

        #if arch(arm64) || arch(i386) || arch(x86_64)
        WidgetCenter.shared.reloadAllTimelines()
        #endif

      }
}
