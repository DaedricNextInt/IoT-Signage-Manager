package com.iotsignage.client.ui.login

import android.content.Intent
import android.os.Bundle
import android.view.KeyEvent
import android.view.inputmethod.EditorInfo
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.isVisible
import androidx.lifecycle.lifecycleScope
import com.iotsignage.client.databinding.ActivityLoginBinding
import com.iotsignage.client.ui.player.PlayerActivity
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

@AndroidEntryPoint
class LoginActivity : AppCompatActivity() {
    private lateinit var binding: ActivityLoginBinding
    private val viewModel: LoginViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupUI()
        observeViewModel()
    }

    private fun setupUI() {
        binding.editPassword.setOnEditorActionListener { _, actionId, event ->
            if (actionId == EditorInfo.IME_ACTION_DONE || (event?.keyCode == KeyEvent.KEYCODE_ENTER && event.action == KeyEvent.ACTION_DOWN)) { attemptLogin(); true } else false
        }
        binding.btnLogin.setOnClickListener { attemptLogin() }
        binding.editEmail.requestFocus()
    }

    private fun observeViewModel() {
        lifecycleScope.launch {
            viewModel.uiState.collectLatest { state ->
                binding.progressBar.isVisible = state.isLoading
                binding.btnLogin.isEnabled = !state.isLoading
                binding.editEmail.isEnabled = !state.isLoading
                binding.editPassword.isEnabled = !state.isLoading
                state.error?.let { binding.textError.text = it; binding.textError.isVisible = true }
                if (state.isLoggedIn) navigateToPlayer()
            }
        }
    }

    private fun attemptLogin() {
        val email = binding.editEmail.text.toString().trim()
        val password = binding.editPassword.text.toString()
        when { email.isEmpty() -> { binding.editEmail.error = "Email is required"; return }; password.isEmpty() -> { binding.editPassword.error = "Password is required"; return } }
        binding.textError.isVisible = false
        viewModel.login(email, password)
    }

    private fun navigateToPlayer() {
        startActivity(Intent(this, PlayerActivity::class.java).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK })
        finish()
    }
}
