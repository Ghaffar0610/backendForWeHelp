import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { FirebaseService } from '../firebase/firebase.service';
import { SignupDocument } from './signup.schema';

@Injectable()
export class AuthenticationService implements OnModuleInit {
    constructor(
        @InjectModel('Signup') private signupModel: Model<SignupDocument>,
        private readonly jwtService: JwtService,
        private readonly firebaseService: FirebaseService,
    ) { }

    async onModuleInit() {
        await this.ensureAdminUser();
        await this.ensureVolunteerUser();
    }

    private signUserToken(user: any) {
        // Ensure `sub` is always a string (ObjectId may be an object);
        // JWT spec allows `sub` to be string or number, but treating it
        // consistently as string avoids frontend type issues.
        const id = user && (user._id ?? user.id ?? user);
        const sub = typeof id === 'string' ? id : id?.toString();
        const payload = { sub: sub, email: user.email, role: user.role ?? 'user' };
        return this.jwtService.sign(payload);
    }

    private async ensureAdminUser() {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminEmail || !adminPassword) {
            return;
        }

        const existing = await this.findByEmail(adminEmail);
        if (existing) {
            if (existing.role !== 'admin') {
                existing.role = 'admin';
                await existing.save();
            }
            return;
        }

        const hashed = await bcrypt.hash(adminPassword, 10);
        await this.signupModel.create({
            username: 'admin',
            email: adminEmail,
            password: hashed,
            role: 'admin',
        });
    }

    private async ensureVolunteerUser() {
        const volunteerEmail = process.env.VOLUNTEER_EMAIL;
        const volunteerPassword = process.env.VOLUNTEER_PASSWORD;
        const volunteerUsername = process.env.VOLUNTEER_USERNAME || 'volunteer';

        if (!volunteerEmail || !volunteerPassword) {
            return;
        }

        const existing = await this.findByEmail(volunteerEmail);
        if (existing) {
            let changed = false;
            if (existing.role !== 'volunteer') {
                existing.role = 'volunteer';
                changed = true;
            }
            if (existing.username !== volunteerUsername) {
                existing.username = volunteerUsername;
                changed = true;
            }
            if (changed) {
                await existing.save();
            }
            return;
        }

        const hashed = await bcrypt.hash(volunteerPassword, 10);
        await this.signupModel.create({
            username: volunteerUsername,
            email: volunteerEmail,
            password: hashed,
            role: 'volunteer',
        });
    }

    async create(data: { username: string; email: string; password: string }) {
        const hashed = await bcrypt.hash(data.password, 10);
        const created = new this.signupModel({ ...data, password: hashed, role: 'user' });
        const saved = await created.save();
        const token = this.signUserToken(saved);
        return { user: saved, access_token: token };
    }

    async findAll() {
        return this.signupModel.find().exec();
    }

    async findByEmail(email: string) {
        return this.signupModel.findOne({ email }).exec();
    }

    async validateUser(email: string, password: string) {
        const user = await this.findByEmail(email);
        if (!user) return null;
        const match = await bcrypt.compare(password, user.password);
        if (!match) return null;
        const token = this.signUserToken(user);
        return { user, access_token: token };
    }

    async updatePassword(email: string, newPassword: string) {
        const user = await this.findByEmail(email);
        if (!user) throw new NotFoundException('User not found');
        user.password = await bcrypt.hash(newPassword, 10);
        return user.save();
    }

    async updateRoleById(userId: string, role: string) {
        const user = await this.signupModel.findById(userId).exec();
        if (!user) throw new NotFoundException('User not found');
        user.role = role;
        return user.save();
    }

    /**
     * Update a user's last known location (latitude, longitude).
     * We store it on the Signup document in `location` for quick retrieval.
     */
    async updateLocationById(userId: string, latitude: number, longitude: number) {
        const user = await this.signupModel.findById(userId).exec();
        if (!user) throw new NotFoundException('User not found');
        user.location = { latitude, longitude } as any;
        return user.save();
    }

    /**
     * Google OAuth Login with Firebase Token Verification
     * 
     * @param idToken - Firebase ID token from Google Sign-In
     * @param username - Username provided by frontend
     * @returns { user, access_token }
     */
    async loginWithGoogle(idToken: string, username: string) {
        try {
            // Verify the Google token with Firebase
            const googleUser = await this.firebaseService.verifyGoogleToken(idToken);

            if (!googleUser.email) {
                throw new BadRequestException('Email not found in Google token');
            }

            // Check if user exists in database
            let user = await this.findByEmail(googleUser.email);

            if (!user) {
                // Create new user with Google OAuth
                const created = new this.signupModel({
                    username: username || googleUser.name || googleUser.email.split('@')[0],
                    email: googleUser.email,
                    password: 'google-oauth-' + googleUser.uid, // Placeholder
                    role: 'user',
                    googleId: googleUser.uid,
                });
                user = await created.save();
            }

            // Generate JWT token for app
            const token = this.signUserToken(user);
            return { user, access_token: token };
        } catch (error) {
            throw new BadRequestException(`Google login failed: ${error.message}`);
        }
    }
}

