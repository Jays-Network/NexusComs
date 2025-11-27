import React, { useState } from "react";
import { View, StyleSheet, Image, Pressable, Modal, FlatList, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Colors, Spacing } from "@/constants/theme";
import { useStreamAuth } from "@/utils/streamAuth";

interface AppHeaderProps {
  onMenuPress?: (option: string) => void;
}

export function AppHeader({ onMenuPress }: AppHeaderProps) {
  const { theme } = useTheme();
  const { user, logout } = useStreamAuth();
  const [menuVisible, setMenuVisible] = useState(false);

  const menuOptions = [
    { id: "profile", label: "Profile", icon: "user" },
    { id: "settings", label: "Settings", icon: "settings" },
    { id: "logout", label: "Logout", icon: "log-out" },
  ];

  const handleMenuOption = (option: string) => {
    setMenuVisible(false);
    if (option === "logout") {
      logout();
    } else {
      onMenuPress?.(option);
    }
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
        {/* Left: Logo + Title */}
        <View style={styles.leftSection}>
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <View>
            <Text style={[styles.appName, { color: theme.text }]}>NexusComs</Text>
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
    width: 40,
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
