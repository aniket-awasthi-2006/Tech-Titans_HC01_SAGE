import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IAdminCredential extends Document {
  key: 'singleton';
  passwordHash?: string;
  passwordUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdminCredentialSchema = new Schema<IAdminCredential>(
  {
    key: { type: String, default: 'singleton', unique: true },
    passwordHash: { type: String },
    passwordUpdatedAt: { type: Date },
  },
  { timestamps: true }
);

const AdminCredential: Model<IAdminCredential> =
  mongoose.models.AdminCredential ||
  mongoose.model<IAdminCredential>('AdminCredential', AdminCredentialSchema);

export default AdminCredential;
