package com.iotsignage.client.ui.player

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.WindowManager
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.isVisible
import androidx.lifecycle.lifecycleScope
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import coil.load
import com.iotsignage.client.R
import com.iotsignage.client.data.model.ContentType
import com.iotsignage.client.data.model.PlaylistItemData
import com.iotsignage.client.databinding.ActivityPlayerBinding
import com.iotsignage.client.service.HeartbeatService
import com.iotsignage.client.ui.login.LoginActivity
import com.iotsignage.client.ui.settings.SettingsActivity
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

@AndroidEntryPoint
class PlayerActivity : AppCompatActivity() {
    private lateinit var binding: ActivityPlayerBinding
    private val viewModel: PlayerViewModel by viewModels()
    private var exoPlayer: ExoPlayer? = null
    private val handler = Handler(Looper.getMainLooper())
    private var currentItemIndex = 0
    private var playlistItems: List<PlaylistItemData> = emptyList()
    private var nextContentRunnable: Runnable? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        binding = ActivityPlayerBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupViews()
        observeViewModel()
        HeartbeatService.start(this)
        viewModel.loadPlaylist()
    }

    private fun setupViews() {
        exoPlayer = ExoPlayer.Builder(this).build().apply {
            binding.playerView.player = this
            addListener(object : Player.Listener { override fun onPlaybackStateChanged(playbackState: Int) { if (playbackState == Player.STATE_ENDED) playNextContent() } })
        }
        binding.playerView.useController = false
    }

    private fun observeViewModel() {
        lifecycleScope.launch {
            viewModel.uiState.collectLatest { state ->
                binding.progressBar.isVisible = state.isLoading
                state.error?.let { binding.errorLayout.isVisible = true; binding.textError.text = it }
                state.playlist?.let { playlist -> playlistItems = playlist.items; if (playlistItems.isNotEmpty()) { binding.errorLayout.isVisible = false; currentItemIndex = 0; playContent(playlistItems[currentItemIndex]) } }
                if (state.isLoggedOut) navigateToLogin()
            }
        }
    }

    private fun playContent(item: PlaylistItemData) {
        HeartbeatService.updatePlaybackState(this, item.content.id, viewModel.uiState.value.playlist?.id, true)
        viewModel.logPlaybackStart(item.content.id)
        hideAllContentViews()
        when (item.content.type) {
            ContentType.IMAGE -> { binding.imageView.isVisible = true; item.content.url?.let { binding.imageView.load(it) { crossfade(500); error(R.drawable.error_placeholder) } }; scheduleNextContent(item.duration * 1000L) }
            ContentType.VIDEO, ContentType.STREAM -> { binding.playerView.isVisible = true; item.content.url?.let { exoPlayer?.setMediaItem(MediaItem.fromUri(it)); exoPlayer?.prepare(); exoPlayer?.play() }; scheduleNextContent((item.content.duration ?: item.duration) * 1000L) }
            ContentType.WEB_URL, ContentType.HTML, ContentType.YOUTUBE -> { binding.webView.isVisible = true; item.content.url?.let { if (item.content.type == ContentType.HTML) binding.webView.loadData(it, "text/html", "UTF-8") else binding.webView.loadUrl(it) }; scheduleNextContent(item.duration * 1000L) }
        }
    }

    private fun scheduleNextContent(delayMs: Long) { nextContentRunnable?.let { handler.removeCallbacks(it) }; nextContentRunnable = Runnable { playNextContent() }; handler.postDelayed(nextContentRunnable!!, delayMs) }
    private fun playNextContent() { if (playlistItems.isEmpty()) return; if (currentItemIndex < playlistItems.size) viewModel.logPlaybackEnd(playlistItems[currentItemIndex].content.id, true); currentItemIndex = (currentItemIndex + 1) % playlistItems.size; playContent(playlistItems[currentItemIndex]) }
    private fun hideAllContentViews() { binding.imageView.isVisible = false; binding.playerView.isVisible = false; binding.webView.isVisible = false; binding.webView.loadUrl("about:blank"); exoPlayer?.stop() }
    private fun navigateToLogin() { HeartbeatService.stop(this); startActivity(Intent(this, LoginActivity::class.java).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK }); finish() }
    override fun onDestroy() { super.onDestroy(); exoPlayer?.release(); nextContentRunnable?.let { handler.removeCallbacks(it) } }
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        when (keyCode) {
            KeyEvent.KEYCODE_MENU -> { startActivity(Intent(this, SettingsActivity::class.java)); return true }
            KeyEvent.KEYCODE_DPAD_RIGHT -> { playNextContent(); return true }
            KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE -> { viewModel.loadPlaylist(); return true }
        }
        return super.onKeyDown(keyCode, event)
    }
}
