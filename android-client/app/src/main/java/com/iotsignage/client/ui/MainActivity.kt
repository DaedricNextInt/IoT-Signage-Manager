package com.iotsignage.client.ui

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.iotsignage.client.data.repository.AuthRepository
import com.iotsignage.client.ui.login.LoginActivity
import com.iotsignage.client.ui.player.PlayerActivity
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {
    @Inject lateinit var authRepository: AuthRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        lifecycleScope.launch {
            val isLoggedIn = authRepository.isLoggedIn.first()
            val targetActivity = if (isLoggedIn) PlayerActivity::class.java else LoginActivity::class.java
            startActivity(Intent(this@MainActivity, targetActivity).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK })
            finish()
        }
    }
}
