import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global(): a conexão com o banco é infraestrutura compartilhada por todos
// os módulos de domínio, não faz sentido reimportar PrismaModule em cada um.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
