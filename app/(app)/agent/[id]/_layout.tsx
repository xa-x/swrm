import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useLocalSearchParams } from 'expo-router';
import { useAgent } from '@/lib/hooks';

export default function AgentTabsLayout() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const agent = useAgent(id as any);

    return (
        <NativeTabs>
            <NativeTabs.Trigger name="index">
                <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="chat">
                <NativeTabs.Trigger.Label>Chat</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf="message.fill" md="chat" />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="settings">
                <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf="gear" md="settings" />
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
