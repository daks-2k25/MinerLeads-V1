import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { SearchHistoryService } from './search-history.service';
import { RegisterSearchHistoryDto } from './dto/register-search-history.dto';

@Controller('search-history')
export class SearchHistoryController {
  constructor(private readonly searchHistoryService: SearchHistoryService) {}

  @Get()
  findAll() {
    return this.searchHistoryService.findAll();
  }

  @Post()
  register(@Body() dto: RegisterSearchHistoryDto) {
    return this.searchHistoryService.register(dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.searchHistoryService.remove(id);
  }

  @Get(':id/leads')
  findLeads(@Param('id', ParseIntPipe) id: number) {
    return this.searchHistoryService.findLeadsByHistoryId(id);
  }
}
