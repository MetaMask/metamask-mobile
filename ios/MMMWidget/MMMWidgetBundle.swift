//
//  MMMWidgetBundle.swift
//  MMMWidget
//
//  Created by Seth Kaufman on 5/7/24.
//  Copyright © 2024 MetaMask. All rights reserved.
//

import WidgetKit
import SwiftUI

@main
struct MMMWidgetBundle: WidgetBundle {
    var body: some Widget {
        MMMWidget()
        MMMWidgetLiveActivity()
    }
}
