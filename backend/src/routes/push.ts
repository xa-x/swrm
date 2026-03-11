import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import Expo from 'expo-server-sdk';
import { pushTokens } from '../db';

export const pushRouter = new Hono();

const expo = new Expo();

const getUserId = (c: any) => c.req.header('X-User-Id') || 'demo-user';

// Register push token
pushRouter.post(
  '/register',
  zValidator(
    'json',
    z.object({
      token: z.string(),
      deviceId: z.string().optional(),
    })
  ),
  (c) => {
    const userId = getUserId(c);
    const { token, deviceId } = c.req.valid('json');

    // Validate Expo push token
    if (!Expo.isExpoPushToken(token)) {
      return c.json({ error: 'Invalid Expo push token' }, 400);
    }

    pushTokens.upsert(userId, token, deviceId);

    return c.json({ success: true });
  }
);

// Send notification to user (internal use)
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  const tokenRecord = pushTokens.getByUser(userId);
  
  if (!tokenRecord) {
    console.log(`No push token for user ${userId}`);
    return;
  }

  const message = {
    to: tokenRecord.token,
    sound: 'default' as const,
    title,
    body,
    data: data || {},
  };

  try {
    const chunks = expo.chunkPushNotifications([message]);
    
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }

    console.log(`📤 Push sent to ${userId}: ${title}`);
  } catch (err) {
    console.error(`❌ Push failed for ${userId}:`, err);
  }
}

// Send to multiple users
export async function broadcastNotification(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  await Promise.all(
    userIds.map(userId => sendPushNotification(userId, title, body, data))
  );
}
