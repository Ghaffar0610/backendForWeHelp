import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type SignupDocument = Signup & Document;
@Schema({ timestamps: true })
export class Signup {
    @Prop({ required: true, trim: true })
    username: string;
    @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
    email: string;
    @Prop({ required: true })
    password: string;
    @Prop({ required: false, default: 'user' })
    role: string;
    @Prop({
        required: false,
        type: {
            latitude: { type: Number },
            longitude: { type: Number },
        },
    })
    location?: { latitude?: number; longitude?: number };
    @Prop({ required: false })
    googleId?: string; // Google OAuth ID for Google Sign-In users
    @Prop({ required: false, default: 0 })
    failedLoginAttempts?: number;
    @Prop({ required: false, default: null })
    lockUntil?: Date;
}
export const SignupSchema = SchemaFactory.createForClass(Signup);
