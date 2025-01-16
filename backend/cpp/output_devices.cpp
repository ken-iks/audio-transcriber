#include <CoreAudio/CoreAudio.h>
#include <stdio.h>

void listOutputDevices() {
    UInt32 size = 0;
    AudioObjectPropertyAddress propertyAddress = {
        kAudioHardwarePropertyDevices,
        kAudioObjectPropertyScopeGlobal,
        kAudioObjectPropertyElementMaster
    };

    // Get the size of the device list
    OSStatus status = AudioObjectGetPropertyDataSize(kAudioObjectSystemObject,
                                                     &propertyAddress,
                                                     0,
                                                     NULL,
                                                     &size);

    if (status != noErr) {
        printf("Error getting device list size: %d\n", status);
        return;
    }

    // Allocate memory for the device list
    int deviceCount = size / sizeof(AudioDeviceID);
    AudioDeviceID *deviceIDs = (AudioDeviceID *)malloc(size);

    // Get the list of device IDs
    status = AudioObjectGetPropertyData(kAudioObjectSystemObject,
                                        &propertyAddress,
                                        0,
                                        NULL,
                                        &size,
                                        deviceIDs);

    if (status != noErr) {
        printf("Error getting device list: %d\n", status);
        free(deviceIDs);
        return;
    }

    // Iterate over devices and print their names
    for (int i = 0; i < deviceCount; i++) {
        AudioDeviceID deviceID = deviceIDs[i];
        CFStringRef deviceName = NULL;
        size = sizeof(deviceName);
        AudioObjectPropertyAddress nameAddress = {
            kAudioObjectPropertyName,
            kAudioObjectPropertyScopeGlobal,
            kAudioObjectPropertyElementMaster
        };

        status = AudioObjectGetPropertyData(deviceID,
                                            &nameAddress,
                                            0,
                                            NULL,
                                            &size,
                                            &deviceName);

        if (status == noErr && deviceName != NULL) {
            char name[256];
            CFStringGetCString(deviceName, name, sizeof(name), kCFStringEncodingUTF8);
            printf("Device %d: %s (ID: %u)\n", i, name, deviceID);
            CFRelease(deviceName);
        }
    }

    free(deviceIDs);
}

int main() {
    listOutputDevices();
    return 0;
}