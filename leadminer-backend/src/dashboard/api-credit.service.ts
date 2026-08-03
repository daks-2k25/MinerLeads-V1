import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiCreditDto } from './dto/api-credit.dto';

// Estrutura inicial para o controle de crédito estimado da API do Google
// Places (GOOGLE_API_CREDIT_LIMIT). `consumoEstimado` ainda não é calculado
// a partir de uso real — isso depende de registrar o custo de cada chamada
// feita pelo PlacesService (Text Search / Place Details) e/ou integrar o
// Google Cloud Billing, nenhum dos dois existe ainda.
//
// Ainda não registrado em nenhum módulo nem exposto por controller — é só a
// base (config + tipo + cálculo) para quando o alerta for de fato exibido no
// Dashboard.
@Injectable()
export class ApiCreditService {
  constructor(private readonly configService: ConfigService) {}

  getSnapshot(): ApiCreditDto {
    const creditoInicial =
      this.configService.get<number>('googlePlaces.creditLimit') ?? 0;
    const consumoEstimado = 0;

    return {
      creditoInicial,
      consumoEstimado,
      saldoRestante: creditoInicial - consumoEstimado,
    };
  }
}
