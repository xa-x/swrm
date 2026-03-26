import { httpBatchLink } from '@trpc/client'
import superjson from 'superjson'
import { trpc } from './trpc';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 1000,
    },
  },
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      transformer: superjson,
      url: `${API_URL}/trpc`,
      async headers() {
        // Add Clerk token when available
        // const token = await getToken();
        // return token ? { Authorization: `Bearer ${token}` } : {};
        return {};
      },
    }),
  ],
});

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
