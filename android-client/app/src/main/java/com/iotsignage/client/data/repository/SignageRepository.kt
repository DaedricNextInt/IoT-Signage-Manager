package com.iotsignage.client.data.repository

import com.iotsignage.client.data.api.SignageApi
import com.iotsignage.client.data.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

sealed class ApiResult<out T> {
    data class Success<T>(val data: T) : ApiResult<T>()
    data class Error(val message: String, val code: Int? = null) : ApiResult<Nothing>()
}

@Singleton
class SignageRepository @Inject constructor(private val api: SignageApi, private val authRepository: AuthRepository) {
    
    suspend fun login(email: String, password: String): ApiResult<LoginResponse> = withContext(Dispatchers.IO) {
        try {
            val request = LoginRequest(email = email, password = password, deviceId = authRepository.getDeviceId(), deviceInfo = authRepository.getDeviceInfo())
            val response = api.login(request)
            if (response.isSuccessful && response.body() != null) {
                val loginResponse = response.body()!!
                authRepository.saveLoginData(loginResponse)
                ApiResult.Success(loginResponse)
            } else {
                ApiResult.Error(message = "Login failed", code = response.code())
            }
        } catch (e: Exception) {
            Timber.e(e, "Login error")
            ApiResult.Error(message = e.message ?: "Network error")
        }
    }
    
    suspend fun sendHeartbeat(status: String = "ONLINE", metrics: MetricsData? = null, playback: PlaybackData? = null, ipAddress: String? = null, wifiSSID: String? = null): ApiResult<HeartbeatResponse> = withContext(Dispatchers.IO) {
        try {
            val response = api.sendHeartbeat(HeartbeatRequest(status, metrics, playback, ipAddress, wifiSSID))
            if (response.isSuccessful && response.body() != null) ApiResult.Success(response.body()!!)
            else { if (response.code() == 401) authRepository.clearAuthData(); ApiResult.Error(message = "Heartbeat failed", code = response.code()) }
        } catch (e: Exception) { ApiResult.Error(message = e.message ?: "Network error") }
    }
    
    suspend fun getPlaylist(): ApiResult<PlaylistData?> = withContext(Dispatchers.IO) {
        try {
            val response = api.getPlaylist()
            if (response.isSuccessful && response.body() != null) ApiResult.Success(response.body()!!.playlist)
            else { if (response.code() == 401) authRepository.clearAuthData(); ApiResult.Error(message = "Failed to get playlist", code = response.code()) }
        } catch (e: Exception) { ApiResult.Error(message = e.message ?: "Network error") }
    }
    
    suspend fun acknowledgeCommand(commandId: String): ApiResult<Boolean> = withContext(Dispatchers.IO) {
        try { val response = api.acknowledgeCommand(commandId); if (response.isSuccessful) ApiResult.Success(true) else ApiResult.Error(message = "Failed") }
        catch (e: Exception) { ApiResult.Error(message = e.message ?: "Network error") }
    }
    
    suspend fun completeCommand(commandId: String, success: Boolean, response: Map<String, Any>? = null, error: String? = null): ApiResult<Boolean> = withContext(Dispatchers.IO) {
        try { val apiResponse = api.completeCommand(commandId, CommandAckRequest(success, response, error)); if (apiResponse.isSuccessful) ApiResult.Success(true) else ApiResult.Error(message = "Failed") }
        catch (e: Exception) { ApiResult.Error(message = e.message ?: "Network error") }
    }
    
    suspend fun sendEvent(eventType: String, eventData: Map<String, Any>? = null, severity: String = "INFO"): ApiResult<String?> = withContext(Dispatchers.IO) {
        try { val response = api.sendEvent(EventRequest(eventType, eventData, severity)); if (response.isSuccessful && response.body() != null) ApiResult.Success(response.body()!!.eventId) else ApiResult.Error(message = "Failed") }
        catch (e: Exception) { ApiResult.Error(message = e.message ?: "Network error") }
    }
    
    suspend fun logPlayback(contentId: String, startedAt: String, endedAt: String? = null, completed: Boolean = false, errorMsg: String? = null): ApiResult<Boolean> = withContext(Dispatchers.IO) {
        try { val response = api.logPlayback(PlaybackLogRequest(contentId, startedAt, endedAt, completed, errorMsg)); if (response.isSuccessful) ApiResult.Success(true) else ApiResult.Error(message = "Failed") }
        catch (e: Exception) { ApiResult.Error(message = e.message ?: "Network error") }
    }
    
    suspend fun logout() { authRepository.clearAuthData() }
}
