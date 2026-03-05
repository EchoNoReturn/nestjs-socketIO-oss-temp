import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SnowflakeId } from '@akashrajpurohit/snowflake-id';

type SnowflakeGenerator = {
  generate: () => string;
};

@Injectable()
export class SnowflakeService {
  private readonly generator: SnowflakeGenerator;

  constructor(private readonly configService: ConfigService) {
    const workerId = this.getWorkerId();
    const epoch = this.getEpoch();
    this.generator = SnowflakeId({
      workerId,
      ...(epoch ? { epoch } : {}),
    });
  }

  nextId(): string {
    return this.generator.generate();
  }

  private getWorkerId(): number {
    const envWorkerId = process.env.SNOWFLAKE_WORKER_ID;
    const envMachineId = process.env.SNOWFLAKE_MACHINE_ID;
    const yamlWorkerId = this.configService.get<unknown>(
      'config.id.snowflake.workerId',
    );
    const yamlMachineId = this.configService.get<unknown>(
      'config.id.snowflake.machineId',
    );

    const fromEnvWorkerId = this.parseWorkerId(envWorkerId);
    if (fromEnvWorkerId !== null) {
      return fromEnvWorkerId;
    }

    const fromEnvMachineId = this.parseWorkerId(envMachineId);
    if (fromEnvMachineId !== null) {
      return fromEnvMachineId;
    }

    const fromYamlWorkerId = this.parseWorkerId(yamlWorkerId);
    if (fromYamlWorkerId !== null) {
      return fromYamlWorkerId;
    }

    const fromYamlMachineId = this.parseWorkerId(yamlMachineId);
    if (fromYamlMachineId !== null) {
      return fromYamlMachineId;
    }

    // Default 0 is safe for single instance; for multi-instance you must set unique IDs.
    return 0;
  }

  private getEpoch(): number | null {
    const env = process.env.SNOWFLAKE_EPOCH;
    const yaml = this.configService.get<unknown>('config.id.snowflake.epoch');

    return this.parseEpoch(env) ?? this.parseEpoch(yaml);
  }

  private parseWorkerId(value: unknown): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const n = this.parseInt(value);
    if (n === null) {
      throw new Error(
        'Invalid snowflake workerId/machineId; must be an integer (0-1023).',
      );
    }

    if (n < 0 || n > 1023) {
      throw new Error('Invalid snowflake workerId/machineId; must be 0-1023.');
    }

    return n;
  }

  private parseEpoch(value: unknown): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const n = this.parseInt(value);
    if (n === null) {
      throw new Error('Invalid snowflake epoch; must be an integer (ms).');
    }

    if (n <= 0) {
      throw new Error('Invalid snowflake epoch; must be a positive integer.');
    }

    return n;
  }

  private parseInt(value: unknown): number | null {
    if (typeof value === 'number' && Number.isInteger(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const n = Number(value);
      if (Number.isInteger(n)) {
        return n;
      }
    }

    return null;
  }
}
