package io.metamask;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import android.widget.RemoteViews;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Implementation of App Widget functionality.
 */
public class BalanceWidget extends AppWidgetProvider {

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager,
                                int appWidgetId) {
        try {
          SharedPreferences sharedPref = context.getSharedPreferences("group.io.metamask.MetaMask", Context.MODE_PRIVATE);
          Log.d("getSharedPreferences", "sharedPref");
          String appString = sharedPref.getString("balance", "{\"balance\":'no data'}");
          JSONObject appData = new JSONObject(appString);
          RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.balance_widget);
          views.setTextViewText(R.id.balance_widget_balance_text, appData.getString("balance"));
          appWidgetManager.updateAppWidget(appWidgetId, views);
        }catch (JSONException e) {
          e.printStackTrace();
        }
      }

      @Override
      public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        // There may be multiple widgets active, so update all of them
        for (int appWidgetId : appWidgetIds) {
          updateAppWidget(context, appWidgetManager, appWidgetId);
        }
      }

      @Override
      public void onEnabled(Context context) {
        // Enter relevant functionality for when the first widget is created
      }

      @Override
      public void onDisabled(Context context) {
        // Enter relevant functionality for when the last widget is disabled
      }
    }



