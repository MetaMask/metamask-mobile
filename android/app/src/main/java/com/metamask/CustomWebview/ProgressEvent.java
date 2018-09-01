package com.metamask.CustomWebview;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.events.Event;
import com.facebook.react.uimanager.events.RCTEventEmitter;

public class ProgressEvent extends Event<ProgressEvent> {

    public static final String EVENT_NAME = "progress";

    private final int mProgress;

    public ProgressEvent(int viewId, int progress) {
        super(viewId);
        mProgress = progress;
    }

    @Override
    public String getEventName() {
        return EVENT_NAME;
    }

    @Override
    public void dispatch(RCTEventEmitter rctEventEmitter) {
        WritableMap data = Arguments.createMap();
        data.putInt("progress", mProgress);
        rctEventEmitter.receiveEvent(getViewTag(), EVENT_NAME, data);
    }
}
