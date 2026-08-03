import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { LeadsModule } from './leads/leads.module';
import { ScraperModule } from './scraper/scraper.module';
import { PlacesModule } from './places/places.module';
import { SavedSearchesModule } from './saved-searches/saved-searches.module';
import { SearchHistoryModule } from './search-history/search-history.module';
import { ExportModule } from './export/export.module';
import { LogsModule } from './logs/logs.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    PrismaModule,
    LogsModule,
    AuthModule,
    LeadsModule,
    SavedSearchesModule,
    SearchHistoryModule,
    ScraperModule,
    PlacesModule,
    ExportModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
