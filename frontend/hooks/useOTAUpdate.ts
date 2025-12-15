import { useState, useEffect, useCallback, useRef } from 'react';
import * as Updates from 'expo-updates';
import { AppState, AppStateStatus } from 'react-native';

export type OTAUpdateStatus = 
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'ready'
  | 'error'
  | 'no-update';

interface OTAUpdateState {
  status: OTAUpdateStatus;
  message: string;
  isModalVisible: boolean;
  error: string | null;
}

interface UseOTAUpdateReturn extends OTAUpdateState {
  checkForUpdate: () => Promise<void>;
  applyUpdate: () => Promise<void>;
  dismissModal: () => void;
}

export function useOTAUpdate(): UseOTAUpdateReturn {
  const [state, setState] = useState<OTAUpdateState>({
    status: 'idle',
    message: '',
    isModalVisible: false,
    error: null,
  });

  const hasCheckedRef = useRef(false);
  const isCheckingRef = useRef(false);

  const updateState = useCallback((updates: Partial<OTAUpdateState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const checkForUpdate = useCallback(async () => {
    if (!Updates.isEnabled) {
      return;
    }

    if (isCheckingRef.current) {
      return;
    }

    isCheckingRef.current = true;

    try {
      updateState({ 
        status: 'checking', 
        message: 'Checking for updates...',
        error: null 
      });

      const checkResult = await Updates.checkForUpdateAsync();

      if (!checkResult.isAvailable) {
        updateState({ 
          status: 'no-update', 
          message: '',
          isModalVisible: false 
        });
        isCheckingRef.current = false;
        return;
      }

      updateState({ 
        status: 'downloading', 
        message: 'Downloading update...',
        isModalVisible: true 
      });

      await Updates.fetchUpdateAsync();

      updateState({ 
        status: 'ready', 
        message: 'A new update is ready. Refresh the app to apply it.',
        isModalVisible: true 
      });

    } catch (error: any) {
      const errorMessage = error?.message || 'Update check failed';
      console.warn('[OTA Update] Error:', errorMessage);
      
      updateState({ 
        status: 'error', 
        message: '',
        error: errorMessage,
        isModalVisible: false 
      });
    } finally {
      isCheckingRef.current = false;
    }
  }, [updateState]);

  const applyUpdate = useCallback(async () => {
    if (state.status !== 'ready') {
      return;
    }

    try {
      updateState({ isModalVisible: false });
      await Updates.reloadAsync();
    } catch (error: any) {
      console.error('[OTA Update] Reload failed:', error);
      updateState({ 
        status: 'error', 
        error: 'Failed to apply update. Please restart the app manually.',
        isModalVisible: false 
      });
    }
  }, [state.status, updateState]);

  const dismissModal = useCallback(() => {
    updateState({ isModalVisible: false });
  }, [updateState]);

  useEffect(() => {
    if (!Updates.isEnabled) {
      return;
    }

    if (!hasCheckedRef.current) {
      hasCheckedRef.current = true;
      checkForUpdate();
    }
  }, [checkForUpdate]);

  useEffect(() => {
    if (!Updates.isEnabled) {
      return;
    }

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && state.status !== 'ready' && state.status !== 'downloading') {
        checkForUpdate();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [checkForUpdate, state.status]);

  return {
    ...state,
    checkForUpdate,
    applyUpdate,
    dismissModal,
  };
}
