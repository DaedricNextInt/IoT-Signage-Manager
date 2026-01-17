package com.iotsignage.client.data.api

import com.iotsignage.client.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface SignageApi {
    @POST("device/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>
    
    @POST("device/auth/refresh")
    suspend fun refreshToken(): Response<Map<String, String>>
    
    @POST("device/heartbeat")
    suspend fun sendHeartbeat(@Body request: HeartbeatRequest): Response<HeartbeatResponse>
    
    @POST("device/command/{id}/ack")
    suspend fun acknowledgeCommand(@Path("id") commandId: String): Response<Map<String, Boolean>>
    
    @POST("device/command/{id}/complete")
    suspend fun completeCommand(@Path("id") commandId: String, @Body request: CommandAckRequest): Response<Map<String, Boolean>>
    
    @POST("device/event")
    suspend fun sendEvent(@Body request: EventRequest): Response<EventResponse>
    
    @POST("device/log")
    suspend fun sendLog(@Body request: Map<String, Any>): Response<Map<String, Boolean>>
    
    @POST("device/playback")
    suspend fun logPlayback(@Body request: PlaybackLogRequest): Response<Map<String, Any>>
    
    @GET("device/playlist")
    suspend fun getPlaylist(): Response<PlaylistResponse>
    
    @GET("device/settings")
    suspend fun getSettings(): Response<SettingsResponse>
    
    @POST("device/screenshot")
    suspend fun uploadScreenshot(@Body request: Map<String, Any>): Response<Map<String, Any>>
}
