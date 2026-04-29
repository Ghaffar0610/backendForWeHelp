import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FirebaseService {
    private firebaseApp?: admin.app.App;
    private auth?: admin.auth.Auth;

    constructor() {
        // Initialize Firebase Admin SDK
        // Make sure you have serviceAccountKey.json in your project root
        // You can download it from: Firebase Console > Project Settings > Service Accounts > Generate new private key

        const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');

        if (!fs.existsSync(serviceAccountPath)) {
            console.warn('Firebase serviceAccountKey.json not found. Firebase auth features are disabled.');
            return;
        }

        if (!this.firebaseApp) {
            this.firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccountPath),
                databaseURL: process.env.FIREBASE_DATABASE_URL || '',
            });
            this.auth = admin.auth(this.firebaseApp);
        }
    }

    /**
     * Verify Google ID token from Firebase
     * @param idToken - The ID token from Google Sign-In
     * @returns Decoded token with user info (uid, email, name, picture)
     */
    async verifyGoogleToken(idToken: string) {
        this.ensureFirebaseReady();

        try {
            const decodedToken = await this.auth!.verifyIdToken(idToken);
            return {
                uid: decodedToken.uid,
                email: decodedToken.email,
                name: decodedToken.name,
                picture: decodedToken.picture,
                emailVerified: decodedToken.email_verified,
                authProvider: decodedToken.firebase?.sign_in_provider,
            };
        } catch (error) {
            throw new Error(`Failed to verify token: ${error.message}`);
        }
    }

    /**
     * Create a custom JWT token for app authentication
     * (Optional: if you want to use Firebase JWT instead of your own)
     */
    async createCustomToken(uid: string) {
        this.ensureFirebaseReady();

        try {
            return await this.auth!.createCustomToken(uid);
        } catch (error) {
            throw new Error(`Failed to create custom token: ${error.message}`);
        }
    }

    /**
     * Get user info from Firebase
     */
    async getUserInfo(uid: string) {
        this.ensureFirebaseReady();

        try {
            return await this.auth!.getUser(uid);
        } catch (error) {
            throw new Error(`Failed to get user info: ${error.message}`);
        }
    }

    private ensureFirebaseReady() {
        if (!this.auth) {
            throw new Error('Firebase is not configured. Add serviceAccountKey.json to enable Firebase auth features.');
        }
    }
}
