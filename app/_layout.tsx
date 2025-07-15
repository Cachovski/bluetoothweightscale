import { Stack } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { BLEProvider, useBLEContext } from "../contexts/BLEContext";

function NavigationLayout() {
  const { isConnected } = useBLEContext();

  if (!isConnected) {
    // Show stack navigation when not connected (no drawer)
    return (
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: "#ff0000",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "Weight Scale",
            headerShown: true,
            headerLeft: () => null, // Remove back button
          }}
        />
        <Stack.Screen
          name="menu"
          options={{
            title: "Commands",
            headerShown: true,
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="rmessage"
          options={{
            title: "R Message",
            headerShown: true,
            headerBackTitle: "Back",
          }}
        />
      </Stack>
    );
  }

  // Show drawer navigation when connected
  return (
    <Drawer
      screenOptions={{
        headerStyle: {
          backgroundColor: "#ff0000",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
        drawerStyle: {
          backgroundColor: "#f8f9fa",
          width: 240,
        },
        drawerActiveTintColor: "#ff0000",
        drawerInactiveTintColor: "#666",
        drawerActiveBackgroundColor: "#e3f2fd",
        drawerLabelStyle: {
          fontSize: 16,
        },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: "Weight Scale",
          headerShown: true,
          drawerLabel: "Weight Display",
        }}
      />
      <Drawer.Screen
        name="menu"
        options={{
          title: "Commands",
          headerShown: true,
          drawerLabel: "Commands",
        }}
      />
      <Drawer.Screen
        name="rmessage"
        options={{
          title: "Visor",
          headerShown: true,
          drawerLabel: "Visor Display",
        }}
      />
      <Drawer.Screen
        name="jmessage"
        options={{
          title: "J Message",
          headerShown: true,
          drawerLabel: "J Message Manager",
        }}
      />
      <Drawer.Screen
        name="ppcommands"
        options={{
          title: "PP Commands",
          headerShown: true,
          drawerLabel: "PP Commands",
        }}
      />
    </Drawer>
  );
}

export default function RootLayout() {
  return (
    <BLEProvider>
      <NavigationLayout />
    </BLEProvider>
  );
}
