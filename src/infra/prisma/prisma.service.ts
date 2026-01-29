import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';
import { createLoggingExtension } from './prisma.extension';

// Create the extended client type
const createExtendedPrismaClient = (adapter: PrismaPg) => {
  return new PrismaClient({ adapter }).$extends(
    createLoggingExtension({
      logQueries: process.env.NODE_ENV !== 'production',
    }),
  );
};

type ExtendedPrismaClient = ReturnType<typeof createExtendedPrismaClient>;

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly prisma: ExtendedPrismaClient;

  constructor(private readonly config: ConfigService) {
    const databaseUrl = this.config.get<string>('database.url');
    if (!databaseUrl) {
      throw new Error('Database URL is not defined');
    }

    const adapter = new PrismaPg({
      connectionString: databaseUrl,
    });

    this.prisma = createExtendedPrismaClient(adapter);
  }

  async onModuleInit() {
    await this.prisma.$connect();
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  // 👇 expose Prisma API
  get client() {
    return this.prisma;
  }
}
