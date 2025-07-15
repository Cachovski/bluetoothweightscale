import React from "react";
import {
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface PeripheralListProps {
  peripherals: any[];
  onConnect: (peripheral: any) => Promise<void>;
}

const PeripheralList: React.FC<PeripheralListProps> = ({
  peripherals,
  onConnect,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Available Devices</Text>
      <FlatList
        data={peripherals}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => onConnect(item)} style={styles.card}>
            <View style={styles.cardContent}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.name ?? "Unknown Device"}</Text>
                <Text style={styles.subtitle}>
                  Local Name: {item.localName ?? "N/A"}
                </Text>
                <Text style={styles.info}>RSSI: {item.rssi ?? "N/A"} dBm</Text>
                <Text style={styles.info}>ID: {item.id}</Text>
                {item.connecting && (
                  <Text style={styles.connecting}>Connecting...</Text>
                )}
              </View>
              <Image
                source={require('../../assets/images/marques_dispositivo-balanca_24dp.png')}
                style={styles.deviceIcon}
                resizeMode="contain"
              />
            </View>
          </TouchableOpacity>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    paddingBottom: 20,
  },
  header: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIcon: {
    width: 40,
    height: 40,
    marginLeft: 32,
    tintColor: '#323E48',
    paddingLeft: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  info: {
    fontSize: 12,
    color: "#999",
    marginBottom: 2,
  },
  connecting: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "600",
    marginTop: 4,
  },
});

export default PeripheralList;
