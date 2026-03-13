import React, { ReactNode } from "react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { convex } from "../convexClient";
import { useAuth } from "@clerk/clerk-expo";

type Props = { children: ReactNode };

export function ConvexWithClerk({ children }: Props) {
    return (
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            {children}
        </ConvexProviderWithClerk>
    );
}
