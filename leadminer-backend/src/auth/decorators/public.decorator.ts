import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marca uma rota como isenta do JwtAuthGuard global (a ser habilitado quando
// o login for implementado). Ver JwtAuthGuard em src/auth/guards.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
