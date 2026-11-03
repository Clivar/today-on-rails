// Today On Rails: puts the phone's calendar (and optionally the weather) on the watchface,
// through Gadgetbridge. No libraries, only the Android framework.
import java.util.Properties

plugins {
    id("com.android.application")
}

// Release signing: keystore.properties next to this project (not in version control).
//   storeFile=…  storePassword=…  keyAlias=…  keyPassword=…
val keystore = Properties().apply {
    val f = rootProject.file("keystore.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}

android {
    namespace = "app.todayonrails"
    compileSdk = 37

    defaultConfig {
        applicationId = "app.todayonrails"
        minSdk = 31
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

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
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
            if (keystore.isNotEmpty()) signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    testOptions {
        // The parity cases shared with the watchface tests (tests/parity/cases.json). Declared as an
        // input too, so editing only the cases re-runs the tests instead of reporting UP-TO-DATE.
        val parityCases = rootProject.file("../tests/parity/cases.json")
        unitTests.all {
            it.systemProperty("parity.cases", parityCases.absolutePath)
            it.inputs.file(parityCases).withPathSensitivity(PathSensitivity.NONE)
        }
    }

    lint {
        abortOnError = true
        // Gradle/AGP/target SDK versions are pinned to match Gadgetbridge
        disable += setOf("GradleDependency", "OldTargetApi", "AndroidGradlePluginVersion")
    }
}

dependencies {
    // Tests only; the app itself has no dependencies
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20250517") // android.jar's org.json is only a stub on the JVM
}
