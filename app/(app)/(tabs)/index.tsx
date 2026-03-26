import { Text, View, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { trpc } from "../../../lib/trpc";

export default function AgentsScreen() {
  const router = useRouter();
  const { data: agents, isLoading, refetch } = trpc.agents.list.useQuery();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={agents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => refetch()} />}
        ListEmptyComponent={
          <View className="items-center py-20">
            <Text className="text-4xl mb-4">🐝</Text>
            <Text className="text-lg text-gray-500">No agents yet</Text>
            <Text className="text-sm text-gray-400 mt-2">Create your first agent to get started</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            className="bg-gray-50 p-4 mb-3 rounded-xl flex-row justify-between items-center"
            onPress={() => router.push(`/(app)/(agents)/${item.id}`)}
          >
            <View className="flex-1">
              <Text className="text-lg font-semibold">{item.name}</Text>
              <Text className="text-sm text-gray-500">{item.type}</Text>
            </View>
            <View className={`px-3 py-1 rounded-full ${item.status === 'running' ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Text className={`text-xs font-medium ${item.status === 'running' ? 'text-green-700' : 'text-gray-600'}`}>
                {item.status}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
