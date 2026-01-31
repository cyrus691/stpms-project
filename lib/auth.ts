
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const user = await verifyCredentials(credentials.username, credentials.password);
        if (!user) return null;
        return { id: String(user.id), name: user.name, role: user.role } as any;
      }
    })
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/" },
  callbacks: {
    async jwt({ token, user }) {
      if (user && 'role' in user) {
        token.role = (user as any).role;
      }
      if (user && 'id' in user) {
        token.id = (user as any).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.role) {
        session.user = { ...(session.user || {}), role: token.role } as any;
      }
      if (token?.id) {
        session.user = { ...(session.user || {}), id: token.id } as any;
      }
      return session;
    }
  }
};
import bcrypt from "bcryptjs";
import { getConnection } from "@/lib/prisma";
import { getUserModel } from "@/lib/models/User";

export type Role = "admin" | "student" | "business";

export async function verifyCredentials(username: string, password: string) {
  const conn = await getConnection();
  const User = getUserModel(conn);
  
  const user = await User.findOne({ username });
  if (!user || !user.passwordHash) return null;
  if (user.status === "Inactive") return null;

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return null;

  return {
    id: user._id.toString(),
    role: user.role as Role,
    name: user.name,
    status: user.status ?? "Active"
  };
}

export function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}
