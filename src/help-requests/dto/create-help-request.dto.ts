import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { HelpRequestCategory, HelpRequestUrgency } from '../schemas/help-request.schema';

export class CreateHelpRequestDto {
    @IsEnum(HelpRequestCategory)
    category: HelpRequestCategory;

    @IsString()
    @MaxLength(500)
    description: string;

    @IsEnum(HelpRequestUrgency)
    @IsOptional()
    urgency?: HelpRequestUrgency;

    @IsNumber()
    latitude: number;

    @IsNumber()
    longitude: number;

    @IsString()
    @IsOptional()
    locationLabel?: string;

    @IsBoolean()
    @IsOptional()
    isSOS?: boolean;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    mediaUrls?: string[];
}
