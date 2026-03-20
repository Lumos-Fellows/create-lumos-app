import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { cssInterop } from "nativewind";
import { View } from "react-native";
import { HapticTab } from "@/components/haptic-tab";

cssInterop(Feather, {
  className: {
    target: "style",
  },
});

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarBackground: () => (
          <View className="flex-1 border-background border-t bg-background" />
        ),
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
        tabBarStyle: {
          paddingTop: 10,
          elevation: 0,
          shadowOpacity: 0,
          borderTopWidth: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <Feather
              name="home"
              size={24}
              className={focused ? "text-foreground" : "text-muted-foreground"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <Feather
              name="user"
              size={24}
              className={focused ? "text-foreground" : "text-muted-foreground"}
            />
          ),
        }}
      />
    </Tabs>
  );
}
