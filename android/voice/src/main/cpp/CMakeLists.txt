# libvoice.so: whisper.cpp (the submodule at the repo root) plus a small JNI bridge.
cmake_minimum_required(VERSION 3.22)
project(voice C CXX)

set(WHISPER_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../../../../../whisper.cpp)

# Only the library: static, CPU, no examples/tests/server
set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
set(WHISPER_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(WHISPER_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(WHISPER_BUILD_SERVER OFF CACHE BOOL "" FORCE)
set(GGML_NATIVE OFF CACHE BOOL "" FORCE)
set(GGML_OPENMP OFF CACHE BOOL "" FORCE) # ggml's own thread pool
# Every Pixel GrapheneOS supports has dot-product and fp16 instructions (ARMv8.2+): much faster matmuls
set(GGML_CPU_ARM_ARCH "armv8.2-a+dotprod+fp16" CACHE STRING "" FORCE)

add_subdirectory(${WHISPER_DIR} whisper EXCLUDE_FROM_ALL)

add_library(voice SHARED whisper_jni.c)
target_link_libraries(voice whisper android log)
target_compile_options(voice PRIVATE -O3 -Wall -Wextra)
target_link_options(voice PRIVATE -Wl,--gc-sections -Wl,-z,max-page-size=16384)
