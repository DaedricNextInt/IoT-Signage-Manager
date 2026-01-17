package com.iotsignage.client.data.model

import com.google.gson.annotations.SerializedName

data class LoginRequest(val email: String, val password: String, val deviceId: String, val deviceInfo: DeviceInfo? = null)
data class DeviceInfo(val model: String? = null, val manufacturer: String? = null, val androidVersion: String? = null, val appVersion: String? = null, val screenResolution: String? = null, val macAddress: String? = null, val serialNumber: String? = null)
data class LoginResponse(val success: Boolean, val device: DeviceData, val company: CompanyData, val token: String, val expiresAt: String, val playlist: PlaylistData?)
data class DeviceData(val id: String, val deviceId: String, val name: String, val settings: Map<String, Any>?, val timezone: String?)
data class CompanyData(val id: String, val name: String, val logo: String?, val primaryColor: String?, val secondaryColor: String?)
data class PlaylistData(val id: String, val name: String, val transitionType: String?, val transitionDuration: Int?, val items: List<PlaylistItemData>)
data class PlaylistItemData(val id: String, val order: Int, val duration: Int, val content: ContentData)
data class ContentData(val id: String, val name: String, val type: ContentType, val url: String?, val filePath: String?, val duration: Int?, val width: Int?, val height: Int?)
enum class ContentType { @SerializedName("IMAGE") IMAGE, @SerializedName("VIDEO") VIDEO, @SerializedName("WEB_URL") WEB_URL, @SerializedName("HTML") HTML, @SerializedName("YOUTUBE") YOUTUBE, @SerializedName("STREAM") STREAM }
data class PlaylistResponse(val playlist: PlaylistData?)
data class HeartbeatRequest(val status: String = "ONLINE", val metrics: MetricsData? = null, val playback: PlaybackData? = null, val ipAddress: String? = null, val wifiSSID: String? = null)
data class MetricsData(val cpuUsage: Float? = null, val memoryUsage: Float? = null, val memoryTotal: Long? = null, val memoryAvailable: Long? = null, val storageUsage: Float? = null, val storageTotal: Long? = null, val storageAvailable: Long? = null, val cpuTemperature: Float? = null, val networkType: String? = null, val signalStrength: Int? = null, val displayOn: Boolean? = null, val brightness: Int? = null, val volume: Int? = null, val batteryLevel: Int? = null, val batteryCharging: Boolean? = null, val appMemoryUsage: Long? = null)
data class PlaybackData(val currentContentId: String? = null, val currentPlaylistId: String? = null, val isPlaying: Boolean? = null)
data class HeartbeatResponse(val success: Boolean, val commands: List<CommandData>?)
data class CommandData(val id: String, val command: String, val payload: Map<String, Any>?)
data class CommandAckRequest(val success: Boolean, val response: Map<String, Any>? = null, val error: String? = null)
data class EventRequest(val eventType: String, val eventData: Map<String, Any>? = null, val severity: String = "INFO")
data class EventResponse(val success: Boolean, val eventId: String?)
data class PlaybackLogRequest(val contentId: String, val startedAt: String, val endedAt: String? = null, val completed: Boolean = false, val errorMsg: String? = null)
data class SettingsResponse(val device: DeviceSettingsData, val company: CompanySettingsData?)
data class DeviceSettingsData(val id: String, val name: String, val settings: Map<String, Any>?, val timezone: String?, val screenOrientation: String?)
data class CompanySettingsData(val id: String, val name: String, val logo: String?, val primaryColor: String?, val secondaryColor: String?, val settings: Map<String, Any>?)
data class ErrorResponse(val error: String, val details: List<ErrorDetail>? = null)
data class ErrorDetail(val field: String, val message: String)
