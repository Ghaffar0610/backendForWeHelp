import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Connection } from 'mongoose';
import { Readable } from 'stream';

type UploadedFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

@Injectable()
export class HelpRequestMediaService {
  private static readonly maxFiles = 2;
  private static readonly maxFileSizeBytes = 5 * 1024 * 1024;
  private static readonly bucketName = 'help_request_media';

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async upload(files: UploadedFile[] | undefined, baseUrl: string) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one photo is required');
    }

    if (files.length > HelpRequestMediaService.maxFiles) {
      throw new BadRequestException(
        'Only 2 photos can be uploaded per request',
      );
    }

    const mediaUrls: string[] = [];
    for (const file of files) {
      this.validateFile(file);
      const id = await this.saveFile(file);
      mediaUrls.push(`${baseUrl}/help-requests/media/${id.toString()}`);
    }

    return mediaUrls;
  }

  async openDownloadStream(id: string) {
    if (!ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid media id');
    }

    const objectId = new ObjectId(id);
    const db = this.getDb();
    const file = await db
      .collection(`${HelpRequestMediaService.bucketName}.files`)
      .findOne({ _id: objectId });

    if (!file) {
      throw new NotFoundException('Media not found');
    }

    return {
      file,
      stream: this.bucket.openDownloadStream(objectId),
    };
  }

  private validateFile(file: UploadedFile) {
    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    if (file.size > HelpRequestMediaService.maxFileSizeBytes) {
      throw new BadRequestException('Each photo must be 5MB or smaller');
    }
  }

  private saveFile(file: UploadedFile) {
    return new Promise<ObjectId>((resolve, reject) => {
      const uploadStream = this.bucket.openUploadStream(file.originalname, {
        contentType: file.mimetype,
        metadata: {
          originalName: file.originalname,
          uploadedAt: new Date(),
        },
      });

      uploadStream.once('error', reject);
      uploadStream.once('finish', () => resolve(uploadStream.id as ObjectId));
      Readable.from([file.buffer]).pipe(uploadStream);
    });
  }

  private get bucket() {
    return new GridFSBucket(this.getDb(), {
      bucketName: HelpRequestMediaService.bucketName,
    });
  }

  private getDb() {
    const db = this.connection.db;
    if (!db) {
      throw new Error('Database connection is not ready');
    }
    return db;
  }
}
