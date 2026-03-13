import { NativeTabs } from 'expo-router/unstable-native-tabs';


export default function TabsLayout() {
    return (
        <NativeTabs>
            <NativeTabs.Trigger name="index">
                <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
            </NativeTabs.Trigger>
            {/* <NativeTabs.Trigger name="chat">
                <NativeTabs.Trigger.Icon sf="message.fill" md="chat" />
                <NativeTabs.Trigger.Label>Chat</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger> */}
            <NativeTabs.Trigger name="settings">
                <NativeTabs.Trigger.Icon sf="gear" md="settings" />
                <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}