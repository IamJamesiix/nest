import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const agentInfoSchema = new mongoose.Schema(
  {
    businessName: String,
    officeAddress: String,
    idType: { type: String, enum: ["nin", "drivers_license", "voters_card", "passport", "cac"] },
    idNumber: String,
    idDocumentUrl: String,
    cacNumber: String,
    // not_submitted -> pending -> approved / rejected
    verificationStatus: {
      type: String,
      enum: ["not_submitted", "pending", "approved", "rejected"],
      default: "not_submitted",
    },
    rejectionReason: String,
    submittedAt: Date,
    verifiedAt: Date,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true },
    email: { type: String, required: [true, "Email is required"], unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String, required: [true, "Password is required"], minlength: [6, "Password must be at least 6 characters"], select: false },
    // "student" is the house finder
    role: { type: String, enum: ["student", "agent", "admin"], default: "student" },
    isBanned: { type: Boolean, default: false },

    // student stuff
    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Listing" }],

    // agent stuff
    agentInfo: agentInfoSchema,
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.checkPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// never send password or id number back in responses
userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("User", userSchema);
