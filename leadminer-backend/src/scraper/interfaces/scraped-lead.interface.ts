import { LeadResponseDto } from '../../leads/dto/lead-response.dto';

export interface ScrapedLead extends LeadResponseDto {
  isCached: boolean;
  cachedLeadId: number | null;
}
