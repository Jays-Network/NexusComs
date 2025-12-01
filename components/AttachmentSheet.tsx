import { useState, useRef } from 'react';
import { View, StyleSheet, Pressable, Text, Modal, Platform, Alert, Linking, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';

interface AttachmentOption {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  color: string;
}

interface AttachmentSheetProps {
  visible: boolean;
  onClose: () => void;
  onAttachment: (type: string, data: any) => void;
}

export function AttachmentSheet({ visible, onClose, onAttachment }: AttachmentSheetProps) {
  const { theme, isDark } = useTheme();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingType, setProcessingType] = useState<string | null>(null);
  const isProcessingRef = useRef(false);

  const openSettings = () => {
    if (Platform.OS !== 'web') {
      try {
        Linking.openSettings();
      } catch (error) {
        console.error('Could not open settings:', error);
      }
    }
  };

  const showPermissionDenied = (feature: string) => {
    if (Platform.OS === 'web') {
      window.alert(`Permission to access ${feature} was denied. Please enable it in your browser settings.`);
    } else {
      Alert.alert(
        'Permission Required',
        `Permission to access ${feature} was denied. Please enable it in Settings.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openSettings },
        ]
      );
    }
  };

  const handleGallery = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    setProcessingType('gallery');

    try {
      const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        if (!canAskAgain && Platform.OS !== 'web') {
          showPermissionDenied('photo library');
        } else if (Platform.OS === 'web') {
          window.alert('Permission to access gallery is required.');
        } else {
          Alert.alert('Permission Required', 'Permission to access gallery is required.');
        }
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onAttachment('gallery', result.assets[0]);
        onClose();
      }
    } catch (error) {
      console.error('Gallery error:', error);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
      setProcessingType(null);
    }
  };

  const handleCamera = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    setProcessingType('camera');

    try {
      const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        if (!canAskAgain && Platform.OS !== 'web') {
          showPermissionDenied('camera');
        } else if (Platform.OS === 'web') {
          window.alert('Permission to access camera is required.');
        } else {
          Alert.alert('Permission Required', 'Permission to access camera is required.');
        }
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onAttachment('camera', result.assets[0]);
        onClose();
      }
    } catch (error) {
      console.error('Camera error:', error);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
      setProcessingType(null);
    }
  };

  const handleLocation = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    setProcessingType('location');

    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        if (!canAskAgain && Platform.OS !== 'web') {
          showPermissionDenied('location');
        } else if (Platform.OS === 'web') {
          window.alert('Permission to access location is required.');
        } else {
          Alert.alert('Permission Required', 'Permission to access location is required.');
        }
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      onAttachment('location', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      onClose();
    } catch (error) {
      console.error('Location error:', error);
      if (Platform.OS === 'web') {
        window.alert('Could not get your location. Please try again.');
      } else {
        Alert.alert('Error', 'Could not get your location. Please try again.');
      }
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
      setProcessingType(null);
    }
  };

  const handleContact = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    setProcessingType('contact');

    try {
      if (Platform.OS === 'web') {
        window.alert('Contact sharing requires the mobile app. Please use Expo Go.');
        return;
      }

      const { status, canAskAgain } = await Contacts.requestPermissionsAsync();
      
      if (status !== 'granted') {
        if (!canAskAgain) {
          showPermissionDenied('contacts');
        } else {
          Alert.alert('Permission Required', 'Permission to access contacts is required.');
        }
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
        pageSize: 100,
      });

      if (data.length > 0) {
        Alert.alert(
          'Select a Contact',
          `Found ${data.length} contacts. Contact selection coming soon. For now, sharing first contact.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Share First Contact',
              onPress: () => {
                onAttachment('contact', data[0]);
                onClose();
              }
            }
          ]
        );
      } else {
        Alert.alert('No Contacts', 'No contacts found on this device.');
      }
    } catch (error) {
      console.error('Contact error:', error);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
      setProcessingType(null);
    }
  };

  const handleDocument = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    setProcessingType('document');

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        onAttachment('document', result.assets[0]);
        onClose();
      }
    } catch (error) {
      console.error('Document error:', error);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
      setProcessingType(null);
    }
  };

  const handleAudio = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    setProcessingType('audio');

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        onAttachment('audio', result.assets[0]);
        onClose();
      }
    } catch (error) {
      console.error('Audio error:', error);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
      setProcessingType(null);
    }
  };

  const handlePoll = async () => {
    if (isProcessingRef.current) return;
    
    onAttachment('poll', { type: 'poll' });
    onClose();
  };

  const handleEvent = async () => {
    if (isProcessingRef.current) return;
    
    onAttachment('event', { type: 'event' });
    onClose();
  };

  const attachmentOptions: (AttachmentOption & { onPress: () => Promise<void> })[] = [
    { id: 'gallery', icon: 'image', label: 'Gallery', color: '#2563EB', onPress: handleGallery },
    { id: 'camera', icon: 'camera', label: 'Camera', color: '#DC2626', onPress: handleCamera },
    { id: 'location', icon: 'map-pin', label: 'Location', color: '#16A34A', onPress: handleLocation },
    { id: 'contact', icon: 'user', label: 'Contact', color: '#2563EB', onPress: handleContact },
    { id: 'document', icon: 'file-text', label: 'Document', color: '#7C3AED', onPress: handleDocument },
    { id: 'audio', icon: 'headphones', label: 'Audio', color: '#EA580C', onPress: handleAudio },
    { id: 'poll', icon: 'bar-chart-2', label: 'Poll', color: '#9333EA', onPress: handlePoll },
    { id: 'event', icon: 'calendar', label: 'Event', color: '#E11D48', onPress: handleEvent },
  ];

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <BlurView intensity={isDark ? 40 : 60} style={styles.blurOverlay} tint={isDark ? 'dark' : 'light'}>
          <Pressable 
            style={[styles.sheet, { backgroundColor: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)' }]} 
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.handle}>
              <View style={[styles.handleBar, { backgroundColor: theme.border }]} />
            </View>
            
            <View style={styles.optionsGrid}>
              {attachmentOptions.map((option) => (
                <Pressable
                  key={option.id}
                  style={({ pressed }) => [
                    styles.optionButton,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={option.onPress}
                  disabled={isProcessing}
                >
                  <View style={[styles.optionIcon, { backgroundColor: option.color }]}>
                    {processingType === option.id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Feather name={option.icon} size={24} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={[styles.optionLabel, { color: theme.text }]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable 
              style={[styles.cancelButton, { backgroundColor: theme.backgroundSecondary }]}
              onPress={onClose}
              disabled={isProcessing}
            >
              <Text style={[styles.cancelText, { color: theme.text }]}>Cancel</Text>
            </Pressable>
          </Pressable>
        </BlurView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  blurOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  handle: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  optionButton: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  optionLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  cancelButton: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
