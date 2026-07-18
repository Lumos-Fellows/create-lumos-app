import type { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import * as Haptics from "expo-haptics";
import {
  Platform,
  Pressable,
  type GestureResponderEvent,
} from "react-native";

type StaticTabsScreenOptions = Extract<
  NonNullable<ComponentProps<typeof Tabs>["screenOptions"]>,
  { tabBarButton?: unknown }
>;
type HapticTabProps = Parameters<
  NonNullable<StaticTabsScreenOptions["tabBarButton"]>
>[0];
type PressableProps = ComponentProps<typeof Pressable>;

export function HapticTab(props: HapticTabProps) {
  return (
    <Pressable
      {...(props as PressableProps)}
      onPressIn={(ev: GestureResponderEvent) => {
        if (Platform.OS === "ios") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
