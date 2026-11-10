// Today On Rails Voice: Zepp Flow voice from the watch (through Gadgetbridge's voice service) →
// on-device Whisper → written into the current calendar event. No network, no libraries: only the
// Android framework and whisper.cpp (submodule ../whisper.cpp, built with the NDK).
import java.util.Properties

plugins {
    id("com.android.application")
}

// Same release key as the main app: keystore.properties next to this project (not in version control).
val keystore = Properties().apply {
    val f = rootProject.file("keystore.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}

// The Whisper model bundled in the APK (tools/voice-model.sh downloads it; not in version control).
// Change with -PvoiceModel=base-q5_1 (or in gradle.properties).
val voiceModel = (findProperty("voiceModel") as String?) ?: "small-q5_1"
val modelAsset = "models/ggml-$voiceModel.bin"

android {
    namespace = "app.todayonrails.voice"
    compileSdk = 37
    ndkVersion = "29.0.14206865"

    defaultConfig {
        applicationId = "app.todayonrails.voice"
        minSdk = 31
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
        buildConfigField("String", "MODEL_ASSET", "\"$modelAsset\"")
        buildConfigField("String", "MODEL_NAME", "\"$voiceModel\"")
        // Pixels (GrapheneOS) are 64-bit ARM only
        ndk { abiFilters += "arm64-v8a" }
    }

    externalNativeBuild {
        cmake {
            path = file("src/main/cpp/CMakeLists.txt")
            version = "4.1.2"
        }
    }

    // Whisper reads the model straight from the APK: keep it uncompressed
    androidResources { noCompress += "bin" }

    buildFeatures { buildConfig = true }

    signingConfigs {
        if (keystore.isNotEmpty()) {
            create("release") {
                storeFile = rootProject.file(keystore.getProperty("storeFile"))
                storePassword = keystore.getProperty("storePassword")
                keyAlias = keystore.getProperty("keyAlias")
                keyPassword = keystore.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (keystore.isNotEmpty()) signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    lint {
        abortOnError = true
        // Gradle/AGP/target SDK versions are pinned to match Gadgetbridge
        disable += setOf("GradleDependency", "OldTargetApi", "AndroidGradlePluginVersion")
        // Built for the owner's Pixel only (arm64-v8a): no x86 ChromeOS build
        disable += "ChromeOsAbiSupport"
    }
}

// An APK without the model would install fine and then fail on the first recording: stop the build instead
val checkModel by tasks.registering {
    val model = file("src/main/assets/$modelAsset")
    inputs.property("model", modelAsset)
    doLast {
        if (!model.exists()) throw GradleException("Whisper model missing: $model\nRun: tools/voice-model.sh $voiceModel")
    }
}
tasks.matching { it.name.matches(Regex("merge\\w*Assets")) }.configureEach { dependsOn(checkModel) }

dependencies {
    // Tests only; the app itself has no dependencies
    testImplementation("junit:junit:4.13.2")
}
