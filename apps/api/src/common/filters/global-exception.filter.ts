import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

type ErrorBody = {
  statusCode: number;
  message: string | string[];
  path: string;
  traceId: string;
  timestamp: string;
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null && 'message' in res) {
        const m = (res as { message?: string | string[] }).message;
        if (m !== undefined) message = m;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(exception.stack ?? exception.message);
    } else {
      this.logger.error('Unknown exception', exception as object);
    }

    const body: ErrorBody = {
      statusCode: status,
      message,
      path: request.url,
      traceId: randomUUID(),
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }
}
