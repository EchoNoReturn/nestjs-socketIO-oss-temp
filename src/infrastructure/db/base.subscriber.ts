import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';

import { BaseModel } from './base.model';

@EventSubscriber()
export class BaseSubscriber implements EntitySubscriberInterface {
  beforeInsert(event: InsertEvent<BaseModel>): void {
    const entity = event.entity;
    if (entity instanceof BaseModel) {
      if (!entity.id) {
        throw new Error(
          'Entity id is required. Use SnowflakeService to generate id before saving.',
        );
      }
    }
  }
}
