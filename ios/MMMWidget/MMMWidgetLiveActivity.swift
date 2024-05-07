//
//  MMMWidgetLiveActivity.swift
//  MMMWidget
//
//  Created by Seth Kaufman on 5/7/24.
//  Copyright © 2024 MetaMask. All rights reserved.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct MMMWidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

struct MMMWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: MMMWidgetAttributes.self) { context in
            // Lock screen/banner UI goes here
            VStack {
                Text("Hello \(context.state.emoji)")
            }
            .activityBackgroundTint(Color.cyan)
            .activitySystemActionForegroundColor(Color.black)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI goes here.  Compose the expanded UI through
                // various regions, like leading/trailing/center/bottom
                DynamicIslandExpandedRegion(.leading) {
                    Text("Leading")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("Trailing")
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Bottom \(context.state.emoji)")
                    // more content
                }
            } compactLeading: {
                Text("L")
            } compactTrailing: {
                Text("T \(context.state.emoji)")
            } minimal: {
                Text(context.state.emoji)
            }
            .widgetURL(URL(string: "http://www.apple.com"))
            .keylineTint(Color.red)
        }
    }
}

extension MMMWidgetAttributes {
    fileprivate static var preview: MMMWidgetAttributes {
        MMMWidgetAttributes(name: "World")
    }
}

extension MMMWidgetAttributes.ContentState {
    fileprivate static var smiley: MMMWidgetAttributes.ContentState {
        MMMWidgetAttributes.ContentState(emoji: "😀")
     }
     
     fileprivate static var starEyes: MMMWidgetAttributes.ContentState {
         MMMWidgetAttributes.ContentState(emoji: "🤩")
     }
}

#Preview("Notification", as: .content, using: MMMWidgetAttributes.preview) {
   MMMWidgetLiveActivity()
} contentStates: {
    MMMWidgetAttributes.ContentState.smiley
    MMMWidgetAttributes.ContentState.starEyes
}
