package com.iotsignage.client.data.api

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore
import com.iotsignage.client.BuildConfig
import com.iotsignage.client.data.repository.AuthRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "signage_prefs")

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides @Singleton
    fun provideDataStore(@ApplicationContext context: Context): DataStore<Preferences> = context.dataStore

    @Provides @Singleton
    fun provideAuthInterceptor(authRepository: AuthRepository): Interceptor = Interceptor { chain ->
        val token = authRepository.getTokenSync()
        val request = if (token != null) chain.request().newBuilder().addHeader("Authorization", "Bearer $token").build() else chain.request()
        chain.proceed(request)
    }

    @Provides @Singleton
    fun provideOkHttpClient(authInterceptor: Interceptor): OkHttpClient {
        val builder = OkHttpClient.Builder().connectTimeout(30, TimeUnit.SECONDS).readTimeout(30, TimeUnit.SECONDS).writeTimeout(30, TimeUnit.SECONDS).addInterceptor(authInterceptor)
        if (BuildConfig.DEBUG) builder.addInterceptor(HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BODY })
        return builder.build()
    }

    @Provides @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit = Retrofit.Builder().baseUrl(BuildConfig.API_BASE_URL + "/").client(okHttpClient).addConverterFactory(GsonConverterFactory.create()).build()

    @Provides @Singleton
    fun provideSignageApi(retrofit: Retrofit): SignageApi = retrofit.create(SignageApi::class.java)
}
