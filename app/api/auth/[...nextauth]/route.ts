import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyCredentials } from "@/lib/auth";
import { getConnection } from "@/lib/prisma";
import { getLoginEventModel } from "@/lib/models/LoginEvent";
import { logAuditEvent } from "@/lib/audit";
import { getSessionEventModel } from "@/lib/models/SessionEvent";

const handler = NextAuth({
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
        try {
          const conn = await getConnection();
          const LoginEvent = getLoginEventModel(conn);
          const SessionEvent = getSessionEventModel(conn);
          await LoginEvent.create({ userId: user.id, role: user.role });
          await SessionEvent.create({ userId: user.id, role: user.role, loginAt: new Date() });
          await logAuditEvent({
            action: "auth.login",
            actorId: user.id,
            actorRole: user.role,
            details: `User logged in as ${user.role}`
          });
        } catch (error) {
          console.error("Error logging login event:", error);
        }
        return { id: String(user.id), name: user.name, role: user.role } as any;
      }
    })
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/',
  },
  events: {
    async signOut({ token }) {
      try {
        const userId = (token as any)?.id;
        if (!userId) return;
        const conn = await getConnection();
        const SessionEvent = getSessionEventModel(conn);
        const activeSession = await SessionEvent.findOne({ userId, logoutAt: null })
          .sort({ loginAt: -1 })
          .exec();
        if (!activeSession) return;
        const logoutAt = new Date();
        const durationMinutes = Math.round(((logoutAt.getTime() - activeSession.loginAt.getTime()) / 60000) * 10) / 10;
        await SessionEvent.findByIdAndUpdate(activeSession._id, { logoutAt, durationMinutes });
      } catch (error) {
        console.error("Error logging session end:", error);
      }
    }
  },
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
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    }
  }
});

export { handler as GET, handler as POST };
