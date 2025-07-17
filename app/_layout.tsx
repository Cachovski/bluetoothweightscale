import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { Stack, useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BLEProvider, useBLEContext } from "../contexts/BLEContext";

// Custom drawer content component
function CustomDrawerContent(props: any) {
  const router = useRouter();
  const { disconnectFromPeripheral, isConnected } = useBLEContext();

  return (
    <View style={styles.drawerContainer}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerScrollContent}>
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle}>Weight Scale</Text>
          <Text style={styles.drawerSubtitle}>BLE Control Panel</Text>
        </View>
        
        <View style={styles.drawerMainContent}>
          <DrawerItem
            label="Scale"
            onPress={() => router.push('/rmessage')}
            labelStyle={styles.drawerItemLabel}
            style={styles.drawerItem}
          />
          <DrawerItem
            label="P Message"
            onPress={() => router.push('/')}
            labelStyle={styles.drawerItemLabel}
            style={styles.drawerItem}
          />
          <DrawerItem
            label="HTTP Commands"
            onPress={() => router.push('/menu')}
            labelStyle={styles.drawerItemLabel}
            style={styles.drawerItem}
          />
          <DrawerItem
            label="J Message Manager"
            onPress={() => router.push('/jmessage')}
            labelStyle={styles.drawerItemLabel}
            style={styles.drawerItem}
          />
          <DrawerItem
            label="PP Commands"
            onPress={() => router.push('/ppcommands')}
            labelStyle={styles.drawerItemLabel}
            style={styles.drawerItem}
          />
        </View>
      </DrawerContentScrollView>
      
      {/* Bottom section with About and Disconnect */}
      <View style={styles.drawerFooter}>
        <DrawerItem
          label="About"
          onPress={() => router.push('/about')}
          labelStyle={styles.drawerItemLabel}
          style={styles.drawerItem}
        />
        <TouchableOpacity
          style={styles.disconnectButton}
          onPress={() => disconnectFromPeripheral()}
        >
          <Text style={styles.disconnectButtonText}>Disconnect</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function NavigationLayout() {
  const { isConnected, disconnectFromPeripheral } = useBLEContext();

  if (!isConnected) {
    // Show only the scan screen when not connected
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
      </Stack>
    );
  }

  // Show drawer navigation when connected
  return (
    <Drawer
      initialRouteName="rmessage"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
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
        name="rmessage"
        options={{
          title: "Scale",
          headerShown: true,
          drawerLabel: "Scale",
        }}
      />
      <Drawer.Screen
        name="index"
        options={{
          title: "P Message",
          headerShown: true,
          drawerLabel: "P message",
        }}
      />
      <Drawer.Screen
        name="menu"
        options={{
          title: "HTTP Commands",
          headerShown: true,
          drawerLabel: "HTTP Commands",
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
      <Drawer.Screen
        name="about"
        options={{
          title: "About",
          headerShown: true,
          drawerLabel: "About",
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

const styles = StyleSheet.create({
  headerButton: {
    marginRight: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#ffffff",
    borderRadius: 5,
  },
  headerButtonText: {
    color: "#ff0000",
    fontSize: 14,
    fontWeight: "600",
  },
  drawerContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  drawerScrollContent: {
    flexGrow: 1,
  },
  drawerHeader: {
    backgroundColor: "#ff0000",
    padding: 20,
    paddingTop: 50,
    marginBottom: 10,
  },
  drawerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  drawerSubtitle: {
    color: "#ffcccc",
    fontSize: 14,
  },
  drawerMainContent: {
    flex: 1,
  },
  drawerItem: {
    marginHorizontal: 10,
    marginVertical: 2,
    borderRadius: 8,
  },
  drawerItemLabel: {
    fontSize: 16,
    color: "#333",
  },
  drawerFooter: {
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 10,
    paddingBottom: 50, // Extra padding to avoid Android bottom bar
    backgroundColor: "#f8f9fa",
  },
  disconnectButton: {
    backgroundColor: "#ff0000",
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  disconnectButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
