import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateHelpRequestDto } from './dto/create-help-request.dto';
import { HelpRequest, HelpRequestDocument, HelpRequestStatus, HelpRequestUrgency } from './schemas/help-request.schema';

@Injectable()
export class HelpRequestsService {
    constructor(
        @InjectModel('HelpRequest') private readonly helpRequestModel: Model<HelpRequestDocument>,
    ) { }

    async create(seekerId: string, dto: CreateHelpRequestDto) {
        this.ensureObjectId(seekerId, 'Invalid seeker id');
        this.ensureValidCoordinates(dto.latitude, dto.longitude);

        const isSOS = dto.isSOS ?? dto.urgency === HelpRequestUrgency.CRITICAL;
        return this.helpRequestModel.create({
            seekerId: new Types.ObjectId(seekerId),
            category: dto.category,
            description: dto.description,
            urgency: isSOS ? HelpRequestUrgency.CRITICAL : dto.urgency ?? HelpRequestUrgency.MEDIUM,
            location: {
                type: 'Point',
                coordinates: [dto.longitude, dto.latitude],
            },
            locationLabel: dto.locationLabel,
            mediaUrls: dto.mediaUrls ?? [],
            isSOS,
            status: HelpRequestStatus.OPEN,
        });
    }

    async findMine(userId: string) {
        this.ensureObjectId(userId, 'Invalid user id');
        return this.helpRequestModel
            .find({ seekerId: new Types.ObjectId(userId), isVisible: true })
            .sort({ createdAt: -1 })
            .populate('responderId', 'username email role')
            .exec();
    }

    async findAssignedToVolunteer(userId: string) {
        this.ensureObjectId(userId, 'Invalid user id');
        return this.helpRequestModel
            .find({ responderId: new Types.ObjectId(userId), isVisible: true })
            .sort({ createdAt: -1 })
            .populate('seekerId', 'username email location')
            .exec();
    }

    async findOpen() {
        return this.helpRequestModel
            .find({ status: HelpRequestStatus.OPEN, isVisible: true })
            .sort({ isSOS: -1, createdAt: -1 })
            .populate('seekerId', 'username email location')
            .exec();
    }

    async findNearby(latitude: number, longitude: number, radiusMeters = 10000) {
        this.ensureValidCoordinates(latitude, longitude);
        if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
            throw new BadRequestException('radiusMeters must be a positive number');
        }

        return this.helpRequestModel
            .find({
                status: HelpRequestStatus.OPEN,
                isVisible: true,
                location: {
                    $near: {
                        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
                        $maxDistance: radiusMeters,
                    },
                },
            })
            .sort({ isSOS: -1, createdAt: -1 })
            .populate('seekerId', 'username email location')
            .exec();
    }

    async findAllForAdmin(status?: HelpRequestStatus) {
        const query = status ? { status } : {};
        return this.helpRequestModel
            .find(query)
            .sort({ isSOS: -1, createdAt: -1 })
            .populate('seekerId', 'username email role')
            .populate('responderId', 'username email role')
            .exec();
    }

    async accept(requestId: string, volunteerId: string) {
        const request = await this.findByIdOrThrow(requestId);

        if (request.status !== HelpRequestStatus.OPEN) {
            throw new BadRequestException('Only open help requests can be accepted');
        }

        if (request.seekerId.toString() === volunteerId) {
            throw new ForbiddenException('You cannot accept your own help request');
        }

        request.responderId = new Types.ObjectId(volunteerId);
        request.status = HelpRequestStatus.IN_PROGRESS;
        return request.save();
    }

    async resolve(requestId: string, userId: string, role: string) {
        const request = await this.findByIdOrThrow(requestId);

        if (request.status !== HelpRequestStatus.IN_PROGRESS) {
            throw new BadRequestException('Only in-progress help requests can be resolved');
        }

        this.ensureParticipantOrAdmin(request, userId, role);
        request.status = HelpRequestStatus.RESOLVED;
        request.resolvedAt = new Date();
        return request.save();
    }

    async cancel(requestId: string, userId: string, role: string) {
        const request = await this.findByIdOrThrow(requestId);

        if (![HelpRequestStatus.OPEN, HelpRequestStatus.IN_PROGRESS].includes(request.status)) {
            throw new BadRequestException('This help request cannot be cancelled');
        }

        if (role !== 'admin' && request.seekerId.toString() !== userId) {
            throw new ForbiddenException('Only the seeker or an admin can cancel this request');
        }

        request.status = HelpRequestStatus.CANCELLED;
        return request.save();
    }

    async findByIdOrThrow(requestId: string) {
        this.ensureObjectId(requestId, 'Invalid help request id');
        const request = await this.helpRequestModel.findById(requestId).exec();
        if (!request) {
            throw new NotFoundException('Help request not found');
        }
        return request;
    }

    private ensureParticipantOrAdmin(request: HelpRequest, userId: string, role: string) {
        const isSeeker = request.seekerId?.toString() === userId;
        const isResponder = request.responderId?.toString() === userId;
        if (role !== 'admin' && !isSeeker && !isResponder) {
            throw new ForbiddenException('Only request participants or an admin can perform this action');
        }
    }

    private ensureObjectId(id: string, message: string) {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(message);
        }
    }

    private ensureValidCoordinates(latitude: number, longitude: number) {
        if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
            throw new BadRequestException('latitude must be between -90 and 90');
        }
        if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
            throw new BadRequestException('longitude must be between -180 and 180');
        }
    }
}
