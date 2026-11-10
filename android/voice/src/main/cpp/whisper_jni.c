// JNI bridge to whisper.cpp for app.todayonrails.voice.transcribe.Whisper.
// The model is read straight from the APK's assets (stored uncompressed), so it isn't copied to storage.
#include <jni.h>
#include <stdlib.h>
#include <string.h>
#include <android/asset_manager.h>
#include <android/asset_manager_jni.h>
#include <android/log.h>
#include "whisper.h"

#define TAG "VoiceWhisper"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, TAG, __VA_ARGS__)

static size_t asset_read(void *ctx, void *output, size_t size) {
    int n = AAsset_read((AAsset *) ctx, output, size);
    return n > 0 ? (size_t) n : 0;
}

static bool asset_eof(void *ctx) {
    return AAsset_getRemainingLength64((AAsset *) ctx) <= 0;
}

static void asset_close(void *ctx) {
    AAsset_close((AAsset *) ctx);
}

static void log_whisper(enum ggml_log_level level, const char *text, void *user_data) {
    (void) user_data;
    if (level >= GGML_LOG_LEVEL_WARN) LOGW("%s", text);
}

// Loads the model; returns the context pointer, or 0 on failure.
JNIEXPORT jlong JNICALL
Java_app_todayonrails_voice_transcribe_Whisper_nativeLoad(JNIEnv *env, jclass clazz, jobject assets, jstring path) {
    (void) clazz;
    whisper_log_set(log_whisper, NULL);
    AAssetManager *manager = AAssetManager_fromJava(env, assets);
    const char *asset_path = (*env)->GetStringUTFChars(env, path, NULL);
    AAsset *asset = AAssetManager_open(manager, asset_path, AASSET_MODE_STREAMING);
    if (asset == NULL) {
        LOGW("model asset not found: %s", asset_path);
        (*env)->ReleaseStringUTFChars(env, path, asset_path);
        return 0;
    }
    (*env)->ReleaseStringUTFChars(env, path, asset_path);

    whisper_model_loader loader = {
        .context = asset,
        .read = asset_read,
        .eof = asset_eof,
        .close = asset_close,
    };
    struct whisper_context_params params = whisper_context_default_params();
    params.use_gpu = false;
    // whisper_init_with_params closes the loader (and so the asset) itself
    struct whisper_context *ctx = whisper_init_with_params(&loader, params);
    if (ctx == NULL) LOGW("failed to load the model");
    return (jlong) (intptr_t) ctx;
}

JNIEXPORT void JNICALL
Java_app_todayonrails_voice_transcribe_Whisper_nativeFree(JNIEnv *env, jclass clazz, jlong ptr) {
    (void) env;
    (void) clazz;
    if (ptr != 0) whisper_free((struct whisper_context *) (intptr_t) ptr);
}

// Transcribes 16 kHz mono samples. prompt (may be null): text that steers the spelling and vocabulary
// (Whisper's initial prompt). language: "auto" or a code like "en". Returns one segment per line, or
// null on failure. UTF-8 bytes rather than a jstring: NewStringUTF wants modified UTF-8 and aborts on
// the invalid sequences Whisper can produce when a token splits a character.
JNIEXPORT jbyteArray JNICALL
Java_app_todayonrails_voice_transcribe_Whisper_nativeTranscribe(
        JNIEnv *env, jclass clazz, jlong ptr, jfloatArray samples, jstring prompt, jstring language, jint threads) {
    (void) clazz;
    struct whisper_context *ctx = (struct whisper_context *) (intptr_t) ptr;
    if (ctx == NULL) return NULL;

    const char *prompt_chars = prompt != NULL ? (*env)->GetStringUTFChars(env, prompt, NULL) : NULL;
    const char *language_chars = (*env)->GetStringUTFChars(env, language, NULL);

    struct whisper_full_params params = whisper_full_default_params(WHISPER_SAMPLING_BEAM_SEARCH);
    params.n_threads = threads;
    params.translate = false;
    params.language = language_chars;
    params.detect_language = false; // "auto" detects and transcribes in one go
    params.initial_prompt = prompt_chars;
    params.no_context = true;
    params.no_timestamps = true;
    params.suppress_blank = true;
    params.suppress_nst = true; // no "[Music]" and the like
    params.print_progress = false;
    params.print_realtime = false;
    params.print_special = false;
    params.print_timestamps = false;

    jsize n = (*env)->GetArrayLength(env, samples);
    jfloat *pcm = (*env)->GetFloatArrayElements(env, samples, NULL);
    int result = whisper_full(ctx, params, pcm, n);
    (*env)->ReleaseFloatArrayElements(env, samples, pcm, JNI_ABORT);

    jbyteArray text = NULL;
    if (result == 0) {
        int segments = whisper_full_n_segments(ctx);
        size_t length = 1;
        for (int i = 0; i < segments; i++) length += strlen(whisper_full_get_segment_text(ctx, i)) + 1;
        char *joined = calloc(length, 1);
        if (joined != NULL) {
            for (int i = 0; i < segments; i++) {
                if (i > 0) strcat(joined, "\n");
                strcat(joined, whisper_full_get_segment_text(ctx, i));
            }
            jsize bytes = (jsize) strlen(joined);
            text = (*env)->NewByteArray(env, bytes);
            if (text != NULL) (*env)->SetByteArrayRegion(env, text, 0, bytes, (const jbyte *) joined);
            free(joined);
        }
        LOGI("transcribed %d samples into %d segments", n, segments);
    } else {
        LOGW("whisper_full failed: %d", result);
    }

    if (prompt_chars != NULL) (*env)->ReleaseStringUTFChars(env, prompt, prompt_chars);
    (*env)->ReleaseStringUTFChars(env, language, language_chars);
    return text;
}
