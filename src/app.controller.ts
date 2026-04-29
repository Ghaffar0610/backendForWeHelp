import { Controller, Get, Req } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('debug/headers')
  debugHeaders(@Req() req: any) {
    const authorization = req.headers?.authorization ?? null;
    const xAccessToken = req.headers?.['x-access-token'] ?? null;
    return {
      authorization,
      xAccessToken,
      headerKeys: Object.keys(req.headers ?? {}),
      method: req.method,
      url: req.url,
    };
  }
}
