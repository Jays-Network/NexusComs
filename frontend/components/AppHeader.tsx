import React, { useState, useMemo } from "react";
import { View, StyleSheet, Image, Pressable, Modal, FlatList, Text, Alert, Platform } from "react-native";
import { useNavigation, useNavigationState } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { useCometChatAuth } from "@/utils/cometChatAuth";

interface MenuOption {
  id: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}

export function AppHeader() {
  const { theme } = useTheme();
  const { user } = useCometChatAuth();
  const navigation = useNavigation<any>();
  const [menuVisible, setMenuVisible] = useState(false);

  const currentTabName = useNavigationState((state) => {
    if (!state || !state.routes) return 'ChatsTab';
    const route = state.routes[state.index];
    return route?.name || 'ChatsTab';
  });

  const menuOptions = useMemo((): MenuOption[] => {
    const baseOptions: MenuOption[] = [];
    
    switch (currentTabName) {
      case 'ChatsTab':
        baseOptions.push({ id: "new-chat", label: "New Chat", icon: "edit" });
        break;
      case 'GroupsTab':
        baseOptions.push({ id: "new-group", label: "New Group", icon: "users" });
        break;
      case 'AlertsTab':
        baseOptions.push({ id: "refresh-alerts", label: "Refresh", icon: "refresh-cw" });
        break;
      case 'ContactsTab':
        baseOptions.push({ id: "refresh-contacts", label: "Refresh", icon: "refresh-cw" });
        break;
      case 'CallLogTab':
        baseOptions.push({ id: "new-call", label: "New Call", icon: "phone-call" });
        baseOptions.push({ id: "new-group-call", label: "New Group Call", icon: "video" });
        break;
    }
    
    baseOptions.push({ id: "settings", label: "Settings", icon: "settings" });
    return baseOptions;
  }, [currentTabName]);

  const handleMenuOption = (option: string) => {
    setMenuVisible(false);
    
    switch (option) {
      case "settings":
        navigation.navigate("SettingsTab");
        break;
      case "new-chat":
        navigation.navigate("ChatsTab", { screen: "DirectChatsList", params: { openNewChat: true } });
        break;
      case "new-group":
        navigation.navigate("GroupsTab", { screen: "CreateGroup" });
        break;
      case "refresh-alerts":
        navigation.navigate("AlertsTab", { screen: "EmergencyList", params: { refresh: Date.now() } });
        break;
      case "refresh-contacts":
        navigation.navigate("ContactsTab", { screen: "ContactList", params: { refresh: Date.now() } });
        break;
      case "new-call":
        if (Platform.OS === 'web') {
          window.alert('Voice calls require the mobile app');
        } else {
          Alert.alert('New Call', 'Select a contact to start a call');
          navigation.navigate("ContactsTab", { screen: "ContactList", params: { initiateCall: true } });
        }
        break;
      case "new-group-call":
        if (Platform.OS === 'web') {
          window.alert('Video calls require the mobile app');
        } else {
          Alert.alert('Group Call', 'Select a group to start a video call');
          navigation.navigate("GroupsTab", { screen: "GroupList", params: { initiateGroupCall: true } });
        }
        break;
    }
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
        {/* Left: Logo + Title */}
        <View style={styles.leftSection}>
          <Image
            source={require("../assets/images/world-risk-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <View>
            <Text style={[styles.appName, { color: theme.text }]}>World Risk</Text>
            {user && <Text style={[styles.userName, { color: theme.textSecondary }]}>{user.name}</Text>}
          </View>
        </View>

        {/* Right: Menu Button */}
        <Pressable
          onPress={() => setMenuVisible(true)}
          style={({ pressed }) => [
            styles.menuButton,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Feather name="more-vertical" size={24} color={theme.text} />
        </Pressable>
      </View>

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={[styles.menuContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
            <FlatList
              data={menuOptions}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item, index }) => (
                <Pressable
                  onPress={() => handleMenuOption(item.id)}
                  style={({ pressed }) => [
                    styles.menuItem,
                    pressed && { opacity: 0.7 },
                    index !== menuOptions.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 },
                  ]}
                >
                  <Feather name={item.icon as any} size={18} color={theme.text} />
                  <Text style={[styles.menuLabel, { color: theme.text }]}>{item.label}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.md,
  },
  logo: {
    width: 80,
    height: 40,
  },
  appName: {
    fontSize: 18,
    fontWeight: "600",
  },
  userName: {
    fontSize: 12,
  },
  menuButton: {
    padding: Spacing.sm,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  menuContainer: {
    marginTop: 50,
    marginRight: Spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    minWidth: 150,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
});
