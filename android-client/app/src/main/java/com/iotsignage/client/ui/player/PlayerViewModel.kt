package com.iotsignage.client.ui.player

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.iotsignage.client.data.model.PlaylistData
import com.iotsignage.client.data.repository.ApiResult
import com.iotsignage.client.data.repository.SignageRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.Instant
import javax.inject.Inject

data class PlayerUiState(val isLoading: Boolean = false, val playlist: PlaylistData? = null, val error: String? = null, val isLoggedOut: Boolean = false)

@HiltViewModel
class PlayerViewModel @Inject constructor(private val signageRepository: SignageRepository) : ViewModel() {
    private val _uiState = MutableStateFlow(PlayerUiState())
    val uiState: StateFlow<PlayerUiState> = _uiState.asStateFlow()
    private var currentPlaybackStartTime: String? = null

    fun loadPlaylist() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = signageRepository.getPlaylist()) {
                is ApiResult.Success -> if (result.data != null) _uiState.value = _uiState.value.copy(isLoading = false, playlist = result.data) else _uiState.value = _uiState.value.copy(isLoading = false, error = "No playlist assigned")
                is ApiResult.Error -> if (result.code == 401) _uiState.value = _uiState.value.copy(isLoading = false, isLoggedOut = true) else _uiState.value = _uiState.value.copy(isLoading = false, error = result.message)
            }
        }
    }

    fun logPlaybackStart(contentId: String) { currentPlaybackStartTime = Instant.now().toString(); viewModelScope.launch { signageRepository.sendEvent("PLAYBACK_START", mapOf("contentId" to contentId)) } }
    fun logPlaybackEnd(contentId: String, completed: Boolean) { val startTime = currentPlaybackStartTime ?: return; currentPlaybackStartTime = null; viewModelScope.launch { signageRepository.logPlayback(contentId, startTime, Instant.now().toString(), completed) } }
    fun logout() { viewModelScope.launch { signageRepository.logout(); _uiState.value = _uiState.value.copy(isLoggedOut = true) } }
}
