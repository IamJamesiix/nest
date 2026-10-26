import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("mongo connected");
  } catch (err) {
    console.log("mongo connection failed:", err.message);
    process.exit(1);
  }
};

export default connectDB;
