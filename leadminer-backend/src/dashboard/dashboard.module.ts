import { Module } from '@nestjs/common';
import { ApiCreditService } from './api-credit.service';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, ApiCreditService],
})
export class DashboardModule {}
