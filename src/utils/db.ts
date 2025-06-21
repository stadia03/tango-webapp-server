import mongoose from "mongoose";

const MONGODB_URI = process.env.mongo_URL as string;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI not defined");
}

async function dbConnect() {
  try {
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 30000,
      maxPoolSize: 10, // Optional, for connection limit safety
    });
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
}

export default dbConnect;
