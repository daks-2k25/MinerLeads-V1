import { Injectable, NotImplementedException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  // TODO: implementar a autenticação real em uma etapa dedicada, após a
  // migração funcional dos módulos de domínio (ver docs/MIGRACAO-NESTJS.md).
  login(_dto: LoginDto): never {
    throw new NotImplementedException(
      'Login ainda não implementado — apenas a estrutura do módulo foi definida.',
    );
  }
}
