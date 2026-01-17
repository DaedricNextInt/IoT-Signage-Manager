package com.iotsignage.client.util

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import android.os.BatteryManager
import android.os.Build
import android.os.Environment
import android.os.StatFs
import android.provider.Settings
import com.iotsignage.client.data.model.MetricsData

object DeviceMetrics {
    fun collect(context: Context): MetricsData = MetricsData(
        cpuUsage = getCpuUsage(), memoryUsage = getMemoryUsagePercent(context), memoryTotal = getTotalMemory(context), memoryAvailable = getAvailableMemory(context),
        storageUsage = getStorageUsagePercent(), storageTotal = getTotalStorage(), storageAvailable = getAvailableStorage(),
        networkType = getNetworkType(context), signalStrength = getWifiSignalStrength(context), displayOn = isDisplayOn(context),
        brightness = getScreenBrightness(context), volume = getMediaVolume(context), batteryLevel = getBatteryLevel(context), batteryCharging = isBatteryCharging(context)
    )

    private fun getCpuUsage(): Float? = try { val r = java.io.RandomAccessFile("/proc/stat", "r"); val l = r.readLine(); r.close(); val p = l.split("\\s+".toRegex()); val t = p.subList(1, 8).sumOf { it.toLong() }; val a = p[1].toLong() + p[2].toLong() + p[3].toLong() + p[6].toLong() + p[7].toLong(); ((a.toFloat() / t) * 100).coerceIn(0f, 100f) } catch (e: Exception) { null }
    fun getMemoryUsagePercent(context: Context): Float? = try { val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager; val mi = ActivityManager.MemoryInfo(); am.getMemoryInfo(mi); ((mi.totalMem - mi.availMem).toFloat() / mi.totalMem * 100) } catch (e: Exception) { null }
    private fun getTotalMemory(context: Context): Long? = try { val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager; val mi = ActivityManager.MemoryInfo(); am.getMemoryInfo(mi); mi.totalMem } catch (e: Exception) { null }
    private fun getAvailableMemory(context: Context): Long? = try { val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager; val mi = ActivityManager.MemoryInfo(); am.getMemoryInfo(mi); mi.availMem } catch (e: Exception) { null }
    fun getStorageUsagePercent(): Float? = try { val s = StatFs(Environment.getDataDirectory().path); val t = s.blockCountLong * s.blockSizeLong; val a = s.availableBlocksLong * s.blockSizeLong; ((t - a).toFloat() / t * 100) } catch (e: Exception) { null }
    private fun getTotalStorage(): Long? = try { val s = StatFs(Environment.getDataDirectory().path); s.blockCountLong * s.blockSizeLong } catch (e: Exception) { null }
    private fun getAvailableStorage(): Long? = try { val s = StatFs(Environment.getDataDirectory().path); s.availableBlocksLong * s.blockSizeLong } catch (e: Exception) { null }
    private fun getNetworkType(context: Context): String? = try { val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager; if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) { val c = cm.getNetworkCapabilities(cm.activeNetwork); when { c?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true -> "WIFI"; c?.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) == true -> "ETHERNET"; else -> "OTHER" } } else "UNKNOWN" } catch (e: Exception) { null }
    @Suppress("DEPRECATION") fun getWifiSignalStrength(context: Context): Int? = try { val wm = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager; WifiManager.calculateSignalLevel(wm.connectionInfo.rssi, 100) } catch (e: Exception) { null }
    @Suppress("DEPRECATION") fun getWifiSSID(context: Context): String? = try { val wm = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager; wm.connectionInfo.ssid?.replace("\"", "") } catch (e: Exception) { null }
    @Suppress("DEPRECATION") fun getIpAddress(context: Context): String? = try { val wm = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager; val ip = wm.connectionInfo.ipAddress; String.format("%d.%d.%d.%d", ip and 0xff, ip shr 8 and 0xff, ip shr 16 and 0xff, ip shr 24 and 0xff) } catch (e: Exception) { null }
    private fun isDisplayOn(context: Context): Boolean? = try { (context.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager).isInteractive } catch (e: Exception) { null }
    private fun getScreenBrightness(context: Context): Int? = try { Settings.System.getInt(context.contentResolver, Settings.System.SCREEN_BRIGHTNESS) } catch (e: Exception) { null }
    private fun getMediaVolume(context: Context): Int? = try { (context.getSystemService(Context.AUDIO_SERVICE) as android.media.AudioManager).getStreamVolume(android.media.AudioManager.STREAM_MUSIC) } catch (e: Exception) { null }
    private fun getBatteryLevel(context: Context): Int? = try { val bi = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED)); val l = bi?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1; val s = bi?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1; if (l >= 0 && s > 0) (l * 100) / s else null } catch (e: Exception) { null }
    private fun isBatteryCharging(context: Context): Boolean? = try { val bi = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED)); val st = bi?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1; st == BatteryManager.BATTERY_STATUS_CHARGING || st == BatteryManager.BATTERY_STATUS_FULL } catch (e: Exception) { null }
}
