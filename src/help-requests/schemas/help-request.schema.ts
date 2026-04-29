import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type HelpRequestDocument = HelpRequest & Document;

export enum HelpRequestCategory {
    MEDICAL = 'medical',
    DISASTER = 'disaster',
    BLOOD = 'blood_donation',
    ROADBLOCK = 'roadblock',
    FOOD = 'food',
    RESCUE = 'rescue',
    LOST = 'lost_found',
    OTHER = 'other',
}

export enum HelpRequestStatus {
    OPEN = 'open',
    IN_PROGRESS = 'in_progress',
    RESOLVED = 'resolved',
    CANCELLED = 'cancelled',
}

export enum HelpRequestUrgency {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical',
}

@Schema({ timestamps: true, collection: 'help_requests' })
export class HelpRequest {
    @Prop({ type: Types.ObjectId, ref: 'Signup', required: true, index: true })
    seekerId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Signup', default: null, index: true })
    responderId?: Types.ObjectId | null;

    @Prop({ enum: HelpRequestCategory, required: true })
    category: HelpRequestCategory;

    @Prop({ required: true, maxlength: 500 })
    description: string;

    @Prop({ enum: HelpRequestUrgency, default: HelpRequestUrgency.MEDIUM })
    urgency: HelpRequestUrgency;

    @Prop({ enum: HelpRequestStatus, default: HelpRequestStatus.OPEN, index: true })
    status: HelpRequestStatus;

    @Prop({
        type: { type: String, enum: ['Point'], required: true, default: 'Point' },
        coordinates: { type: [Number], required: true },
    })
    location: {
        type: 'Point';
        coordinates: [number, number];
    };

    @Prop({ default: null })
    locationLabel?: string;

    @Prop({ type: [String], default: [] })
    mediaUrls: string[];

    @Prop({ default: false, index: true })
    isSOS: boolean;

    @Prop({ default: true })
    isVisible: boolean;

    @Prop({ type: Date, default: null })
    resolvedAt?: Date | null;

    @Prop({ default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) })
    expiresAt: Date;
}

export const HelpRequestSchema = SchemaFactory.createForClass(HelpRequest);

HelpRequestSchema.index({ location: '2dsphere' });
HelpRequestSchema.index({ status: 1, isSOS: -1, createdAt: -1 });
HelpRequestSchema.index({ seekerId: 1, createdAt: -1 });
HelpRequestSchema.index({ responderId: 1, createdAt: -1 });
HelpRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
