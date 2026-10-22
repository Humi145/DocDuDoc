import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin as adminPlugin } from "better-auth/plugins";
import prisma from "./prisma"; // your prisma client instance

export const adminUserIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
    },
    plugins: [
        adminPlugin({
            adminUserIds,
            defaultBanReason: "Compte suspendu par un administrateur.",
            bannedUserMessage:
                "Votre compte a été suspendu.",
        }),
    ],
    session: {
        expiresIn: 60 * 60 * 24, // 1 jour
        updateAge: 60 * 60, // 1 heure
    },
});