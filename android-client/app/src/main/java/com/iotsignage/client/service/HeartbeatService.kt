package com.iotsignage.client.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.iotsignage.client.BuildConfig
import com.iotsignage.client.R
import com.iotsignage.client.data.model.PlaybackData
import com.iotsignage.client.data.repository.ApiResult
import com.iotsignage.client.data.repository.SignageRepository
import com.iotsignage.client.ui.MainActivity
import com.iotsignage.client.util.DeviceMetrics
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import timber.log.Timber
import javax.inject.Inject

@AndroidEntryPoint
class HeartbeatService : Service() {
    @Inject lateinit var signageRepository: SignageRepository
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var heartbeatJob: Job? = null
    private var currentContentId: String? = null
    private var currentPlaylistId: String? = null
    private var isPlaying: Boolean = false

    companion object {
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "signage_service"
        fun start(context: Context) { val intent = Intent(context, HeartbeatService::class.java).apply { action = "START" }; if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent) else context.startService(intent) }
        fun stop(context: Context) { context.startService(Intent(context, HeartbeatService::class.java).apply { action = "STOP" }) }
        fun updatePlaybackState(context: Context, contentId: String?, playlistId: String?, isPlaying: Boolean) { context.startService(Intent(context, HeartbeatService::class.java).apply { action = "UPDATE"; putExtra("content_id", contentId); putExtra("playlist_id", playlistId); putExtra("is_playing", isPlaying) }) }
    }

    override fun onCreate() { super.onCreate(); createNotificationChannel() }
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            "START" -> { startForeground(NOTIFICATION_ID, createNotification()); startHeartbeat() }
            "STOP" -> { stopHeartbeat(); stopForeground(STOP_FOREGROUND_REMOVE); stopSelf() }
            "UPDATE" -> { currentContentId = intent.getStringExtra("content_id"); currentPlaylistId = intent.getStringExtra("playlist_id"); isPlaying = intent.getBooleanExtra("is_playing", false) }
        }
        return START_STICKY
    }
    override fun onBind(intent: Intent?): IBinder? = null
    override fun onDestroy() { super.onDestroy(); stopHeartbeat(); serviceScope.cancel() }

    private fun startHeartbeat() {
        heartbeatJob?.cancel()
        heartbeatJob = serviceScope.launch {
            while (isActive) {
                try { sendHeartbeat() } catch (e: Exception) { Timber.e(e, "Heartbeat error") }
                delay(BuildConfig.HEARTBEAT_INTERVAL_MS.toLong())
            }
        }
    }

    private fun stopHeartbeat() { heartbeatJob?.cancel(); heartbeatJob = null }

    private suspend fun sendHeartbeat() {
        val metrics = DeviceMetrics.collect(applicationContext)
        val playback = PlaybackData(currentContentId, currentPlaylistId, isPlaying)
        when (val result = signageRepository.sendHeartbeat("ONLINE", metrics, playback, DeviceMetrics.getIpAddress(applicationContext), DeviceMetrics.getWifiSSID(applicationContext))) {
            is ApiResult.Success -> { Timber.d("Heartbeat OK"); result.data.commands?.forEach { cmd -> signageRepository.acknowledgeCommand(cmd.id); processCommand(cmd.command, cmd.payload); signageRepository.completeCommand(cmd.id, true) } }
            is ApiResult.Error -> { Timber.e("Heartbeat failed: ${result.message}"); if (result.code == 401) sendBroadcast(Intent("com.iotsignage.client.AUTH_ERROR")) }
        }
    }

    private fun processCommand(command: String, payload: Map<String, Any>?) {
        when (command) {
            "REFRESH_PLAYLIST" -> sendBroadcast(Intent("com.iotsignage.client.REFRESH_PLAYLIST"))
            "CLEAR_CACHE" -> cacheDir.deleteRecursively()
        }
    }

    private fun createNotificationChannel() { if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) getSystemService(NotificationManager::class.java).createNotificationChannel(NotificationChannel(CHANNEL_ID, "Signage Service", NotificationManager.IMPORTANCE_LOW)) }
    private fun createNotification(): Notification = NotificationCompat.Builder(this, CHANNEL_ID).setContentTitle("IoT Signage").setContentText("Running").setSmallIcon(R.drawable.ic_notification).setContentIntent(PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)).setOngoing(true).build()
}
