package com.iotsignage.client.ui.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.iotsignage.client.data.repository.ApiResult
import com.iotsignage.client.data.repository.SignageRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LoginUiState(val isLoading: Boolean = false, val isLoggedIn: Boolean = false, val error: String? = null, val companyName: String? = null)

@HiltViewModel
class LoginViewModel @Inject constructor(private val signageRepository: SignageRepository) : ViewModel() {
    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = signageRepository.login(email, password)) {
                is ApiResult.Success -> _uiState.value = _uiState.value.copy(isLoading = false, isLoggedIn = true, companyName = result.data.company.name)
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(isLoading = false, error = result.message)
            }
        }
    }
}
