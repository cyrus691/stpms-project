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
    return await connectionPromise;
  }

  const mongoUrl = process.env.DATABASE_URL || process.env.MONGODB_URI;
  if (!mongoUrl) {
    throw new Error("DATABASE_URL or MONGODB_URI is not defined");
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
        bufferCommands: true,
      });
      cachedConnection = connection.connection;
      connectionPromise = null;
      return cachedConnection;
    })();

    await connectionPromise;
    // Ensure connection is ready
    if (!cachedConnection || cachedConnection.readyState !== 1) {
      throw new Error("MongoDB connection failed to initialize");
    }
    return cachedConnection;
  } catch (error) {
    connectionPromise = null;
    cachedConnection = null;
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

export async function getConnection(): Promise<Connection> {
  return connectToDatabase();
}
