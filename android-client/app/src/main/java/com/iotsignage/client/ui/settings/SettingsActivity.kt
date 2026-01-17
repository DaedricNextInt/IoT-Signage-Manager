package com.iotsignage.client.ui.settings

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.iotsignage.client.BuildConfig
import com.iotsignage.client.data.repository.AuthRepository
import com.iotsignage.client.data.repository.SignageRepository
import com.iotsignage.client.databinding.ActivitySettingsBinding
import com.iotsignage.client.service.HeartbeatService
import com.iotsignage.client.ui.login.LoginActivity
import com.iotsignage.client.util.DeviceMetrics
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class SettingsActivity : AppCompatActivity() {
    @Inject lateinit var authRepository: AuthRepository
    @Inject lateinit var signageRepository: SignageRepository
    private lateinit var binding: ActivitySettingsBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupUI()
        loadSettings()
    }

    private fun setupUI() {
        binding.btnBack.setOnClickListener { finish() }
        binding.btnRefreshPlaylist.setOnClickListener { sendBroadcast(Intent("com.iotsignage.client.REFRESH_PLAYLIST")); finish() }
        binding.btnLogout.setOnClickListener { confirmLogout() }
        binding.btnClearCache.setOnClickListener { cacheDir.deleteRecursively(); AlertDialog.Builder(this).setTitle("Cache Cleared").setMessage("Done").setPositiveButton("OK", null).show() }
        binding.textAppVersion.text = "Version ${BuildConfig.VERSION_NAME}"
        binding.textServerUrl.text = BuildConfig.API_BASE_URL
    }

    private fun loadSettings() {
        lifecycleScope.launch {
            binding.textCompanyName.text = authRepository.companyName.first() ?: "Not connected"
            binding.textDeviceName.text = authRepository.deviceName.first() ?: "Unknown"
            binding.textDeviceId.text = authRepository.getDeviceId()
            binding.textAndroidVersion.text = android.os.Build.VERSION.RELEASE
            binding.textDeviceModel.text = "${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}"
            binding.textIpAddress.text = DeviceMetrics.getIpAddress(this@SettingsActivity) ?: "Unknown"
            binding.textWifiNetwork.text = DeviceMetrics.getWifiSSID(this@SettingsActivity) ?: "Unknown"
            DeviceMetrics.getMemoryUsagePercent(this@SettingsActivity)?.let { binding.textMemoryUsage.text = "%.1f%%".format(it) }
            DeviceMetrics.getStorageUsagePercent()?.let { binding.textStorageUsage.text = "%.1f%%".format(it) }
        }
    }

    private fun confirmLogout() {
        AlertDialog.Builder(this).setTitle("Logout").setMessage("Are you sure?").setPositiveButton("Logout") { _, _ ->
            lifecycleScope.launch { signageRepository.logout(); HeartbeatService.stop(this@SettingsActivity); startActivity(Intent(this@SettingsActivity, LoginActivity::class.java).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK }); finish() }
        }.setNegativeButton("Cancel", null).show()
    }
}
