import mongoose from "mongoose";
const g = global as any;
export async function connectDB() {
  if (g._mongoose?.conn) return g._mongoose.conn;
  if (!g._mongoose) g._mongoose = { conn: null, promise: null };
  g._mongoose.promise ||= mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/chainvote", { serverSelectionTimeoutMS: 5000 });
  g._mongoose.conn = await g._mongoose.promise;
  return g._mongoose.conn;
}
