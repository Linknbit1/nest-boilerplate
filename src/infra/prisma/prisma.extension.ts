import { Prisma } from '@prisma/client';

export interface LoggingExtensionOptions {
  logQueries?: boolean;
  logLevel?: 'info' | 'warn' | 'error';
}

/**
 * Creates a Prisma extension for query logging.
 * Works with both default Prisma engine and driver adapters (e.g., PrismaPg).
 *
 * @param options - Configuration options for the logging extension
 * @returns A Prisma extension that logs query execution times
 */
export function createLoggingExtension(options?: LoggingExtensionOptions) {
  const logQueries = options?.logQueries ?? false;
  const logLevel = options?.logLevel ?? 'info';

  return Prisma.defineExtension({
    query: {
      $allOperations: async ({ operation, model, args, query }) => {
        const start = Date.now();
        let error: Error | null = null;

        try {
          const result: unknown = await query(args);
          const duration = Date.now() - start;

          if (logQueries) {
            // Keep it simple; don't log args in production (PII risk).
            const modelName = model ?? 'raw';
            const logMessage = `[Prisma] ${modelName}.${operation} (${duration}ms)`;

            if (logLevel === 'error' && duration > 1000) {
              console.warn(`${logMessage} - Slow query detected`);
            } else {
              console.log(logMessage);
            }
          }

          return result;
        } catch (err) {
          error = err instanceof Error ? err : new Error(String(err));
          const duration = Date.now() - start;
          const modelName = model ?? 'raw';

          if (logQueries) {
            console.error(
              `[Prisma] ${modelName}.${operation} (${duration}ms) - ERROR: ${error.message}`,
            );
          }

          throw err;
        }
      },
    },
  });
}
