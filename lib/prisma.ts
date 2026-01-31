import mongoose, { Connection } from "mongoose";

let cachedConnection: Connection | null = null;
let connectionPromise: Promise<Connection> | null = null;

export async function connectToDatabase(): Promise<Connection> {
  // Return cached connection if available and ready
  if (cachedConnection && cachedConnection.readyState === 1) {
    return cachedConnection;
  }

  // Return existing connection promise if one is in progress
  if (connectionPromise) {
    return connectionPromise;
  }

  const mongoUrl = process.env.DATABASE_URL;
  if (!mongoUrl) {
    throw new Error("DATABASE_URL is not defined");
  }

  try {
    // Create new connection promise
    connectionPromise = (async () => {
      const connection = await mongoose.connect(mongoUrl, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 60000,
        connectTimeoutMS: 30000,
      });
      cachedConnection = connection.connection;
      connectionPromise = null;
      return cachedConnection;
    })();

    return await connectionPromise;
  } catch (error) {
    connectionPromise = null;
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

export async function getConnection(): Promise<Connection> {
  return connectToDatabase();
}
