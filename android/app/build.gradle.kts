plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.kreator.vaultgame"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.kreator.vaultgame"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    flavorDimensions += "cluster"
    productFlavors {
        create("devnet") {
            dimension = "cluster"
            applicationIdSuffix = ".devnet"
            versionNameSuffix = "-devnet"
            buildConfigField("String", "RPC_URI", "\"https://api.devnet.solana.com\"")
            buildConfigField("String", "SKR_MINT", "\"79iXs712Gt4VA7prim4EJkM7EnRr4wXgvwd1QCuAjuih\"")
            buildConfigField("String", "PROGRAM_ID", "\"7dEcm9oky2scx64qDAGEmRYgYovA5qr9qktmswdhTVN\"")
            buildConfigField("String", "DIRECTORY_API_BASE", "\"https://vault-game-mu.vercel.app\"")
        }
        create("mainnet") {
            dimension = "cluster"
            // no suffix for production
            buildConfigField("String", "RPC_URI", "\"https://api.mainnet-beta.solana.com\"")
            buildConfigField("String", "SKR_MINT", "\"SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3\"")
            buildConfigField("String", "PROGRAM_ID", "\"REPLACE_WITH_MAINNET_PROGRAM_ID\"")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.15"
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.10.00")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.activity:activity-compose:1.9.3")

    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")

    implementation("androidx.navigation:navigation-compose:2.8.5")

    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")

    // Solana Mobile Stack (native Android)
    implementation("com.solanamobile:web3-solana:0.2.5")
    implementation("com.solanamobile:rpc-core:0.2.7")
    implementation("com.solanamobile:mobile-wallet-adapter-clientlib-ktx:2.0.0")
    implementation("io.github.funkatronics:multimult:0.2.0")
    implementation("io.ktor:ktor-client-core:2.3.12")
    implementation("io.ktor:ktor-client-android:2.3.12")
    implementation("io.ktor:ktor-client-content-negotiation:2.3.12")
    implementation("io.ktor:ktor-serialization-kotlinx-json:2.3.12")

    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")

    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
}
