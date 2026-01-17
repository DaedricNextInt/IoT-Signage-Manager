package com.iotsignage.client.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.iotsignage.client.ui.MainActivity
import timber.log.Timber

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == "android.intent.action.QUICKBOOT_POWERON") {
            Timber.d("Boot completed, starting signage app")
            context.startActivity(Intent(context, MainActivity::class.java).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP) })
        }
    }
}
