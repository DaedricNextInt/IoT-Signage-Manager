package com.iotsignage.client.data.repository

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.iotsignage.client.data.model.*
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(private val dataStore: DataStore<Preferences>, @ApplicationContext private val context: Context) {
    companion object {
        private val KEY_TOKEN = stringPreferencesKey("device_token")
        private val KEY_TOKEN_EXPIRES = stringPreferencesKey("token_expires_at")
        private val KEY_DEVICE_ID = stringPreferencesKey("device_id")
        private val KEY_DEVICE_NAME = stringPreferencesKey("device_name")
        private val KEY_COMPANY_ID = stringPreferencesKey("company_id")
        private val KEY_COMPANY_NAME = stringPreferencesKey("company_name")
        private val KEY_COMPANY_LOGO = stringPreferencesKey("company_logo")
    }
    
    val tokenFlow: Flow<String?> = dataStore.data.map { it[KEY_TOKEN] }
    val isLoggedIn: Flow<Boolean> = dataStore.data.map { !it[KEY_TOKEN].isNullOrEmpty() }
    val companyName: Flow<String?> = dataStore.data.map { it[KEY_COMPANY_NAME] }
    val deviceName: Flow<String?> = dataStore.data.map { it[KEY_DEVICE_NAME] }
    
    fun getTokenSync(): String? = runBlocking { dataStore.data.first()[KEY_TOKEN] }
    
    suspend fun saveLoginData(response: LoginResponse) {
        dataStore.edit { prefs ->
            prefs[KEY_TOKEN] = response.token
            prefs[KEY_TOKEN_EXPIRES] = response.expiresAt
            prefs[KEY_DEVICE_ID] = response.device.id
            prefs[KEY_DEVICE_NAME] = response.device.name
            prefs[KEY_COMPANY_ID] = response.company.id
            prefs[KEY_COMPANY_NAME] = response.company.name
            response.company.logo?.let { prefs[KEY_COMPANY_LOGO] = it }
        }
        Timber.d("Saved login data for device: ${response.device.name}")
    }
    
    suspend fun updateToken(token: String, expiresAt: String) {
        dataStore.edit { prefs -> prefs[KEY_TOKEN] = token; prefs[KEY_TOKEN_EXPIRES] = expiresAt }
    }
    
    suspend fun clearAuthData() {
        dataStore.edit { prefs ->
            prefs.remove(KEY_TOKEN); prefs.remove(KEY_TOKEN_EXPIRES); prefs.remove(KEY_DEVICE_ID)
            prefs.remove(KEY_DEVICE_NAME); prefs.remove(KEY_COMPANY_ID); prefs.remove(KEY_COMPANY_NAME); prefs.remove(KEY_COMPANY_LOGO)
        }
    }
    
    fun getDeviceInfo(): DeviceInfo = DeviceInfo(model = android.os.Build.MODEL, manufacturer = android.os.Build.MANUFACTURER, androidVersion = android.os.Build.VERSION.RELEASE, appVersion = getAppVersion(), screenResolution = getScreenResolution())
    
    fun getDeviceId(): String = "android-${android.provider.Settings.Secure.getString(context.contentResolver, android.provider.Settings.Secure.ANDROID_ID)}"
    
    private fun getAppVersion(): String = try { context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "1.0.0" } catch (e: Exception) { "1.0.0" }
    private fun getScreenResolution(): String = try { val dm = context.resources.displayMetrics; "${dm.widthPixels}x${dm.heightPixels}" } catch (e: Exception) { "unknown" }
}
