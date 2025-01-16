#include <CoreAudio/CoreAudio.h>
#include <iostream>

const AudioDeviceID MACBOOK_SPEAKER_ID = 47;
const AudioDeviceID BLACKHOLE_SPEAKER_ID = 63;

// Function to get the default output device
AudioDeviceID getDefaultOutputDevice() {
    AudioDeviceID defaultDevice = kAudioObjectUnknown;
    UInt32 size = sizeof(defaultDevice);
    AudioObjectPropertyAddress propertyAddress = {
        kAudioHardwarePropertyDefaultOutputDevice,
        kAudioObjectPropertyScopeGlobal,
        kAudioObjectPropertyElementMaster
    };

    OSStatus status = AudioObjectGetPropertyData(kAudioObjectSystemObject,
                                                 &propertyAddress,
                                                 0,
                                                 nullptr,
                                                 &size,
                                                 &defaultDevice);
    if (status != noErr) {
        std::cerr << "Error getting default output device: " << status << std::endl;
    }
    return defaultDevice;
}

// Function to set the default output device
bool setDefaultOutputDevice(AudioDeviceID deviceID) {
    AudioObjectPropertyAddress propertyAddress = {
        kAudioHardwarePropertyDefaultOutputDevice,
        kAudioObjectPropertyScopeGlobal,
        kAudioObjectPropertyElementMaster
    };

    OSStatus status = AudioObjectSetPropertyData(kAudioObjectSystemObject,
                                                 &propertyAddress,
                                                 0,
                                                 nullptr,
                                                 sizeof(deviceID),
                                                 &deviceID);
    if (status != noErr) {
        std::cerr << "Error setting default output device: " << status << std::endl;
        return false;
    }
    return true;
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cout << "Incorrect usage" << std::endl;
        return -1;
    }

    // Get the current default output device
    AudioDeviceID currentDefault = getDefaultOutputDevice();
    std::cout << "Current default output device ID: " << currentDefault << std::endl;

    std::string device = argv[1];
    AudioDeviceID newDeviceID;
    
    // Change the default device (use a valid AudioDeviceID)
    if (device == "blackhole") {
        newDeviceID = BLACKHOLE_SPEAKER_ID;
    } else {
        newDeviceID = MACBOOK_SPEAKER_ID;
    }
    
    if (setDefaultOutputDevice(newDeviceID)) {
        std::cout << "Successfully changed the default output device to: " << newDeviceID << std::endl;
    }

    return 0;
}
