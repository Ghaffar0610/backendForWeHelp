import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SignupDocument } from '../authentication/signup.schema';

@Injectable()
export class UserService {
    constructor(
        @InjectModel('Signup') private readonly signupModel: Model<SignupDocument>,
    ) { }

    findAllUsers() {
        return this.signupModel
            .find()
            .select('-password')
            .exec();
    }

    findByRole(role: string) {
        return this.signupModel
            .find({ role })
            .select('-password')
            .exec();
    }

    findById(id: string) {
        return this.signupModel
            .findById(id)
            .select('-password')
            .exec();
    }
}
