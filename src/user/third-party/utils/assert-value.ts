import { UnauthorizedException } from '@nestjs/common';

/**
 * 断言调用方传入的参数值存在且类型与配置中声明的类型描述符一致
 * （类型描述符如 "string"、"number"、"boolean"）。
 * 若值缺失或类型不匹配，抛出 UnauthorizedException，视作验证失败而非服务器错误。
 * 验证通过时返回该值。
 */
export function assertValue<L extends string = string>(
  key: string,
  value: unknown,
  expectedType: string,
  location: L,
): unknown {
  if (value === undefined || value === null) {
    throw new UnauthorizedException(
      `Verification failed: required ${location} parameter '${key}' is missing`,
    );
  }
  if (typeof value !== expectedType) {
    throw new UnauthorizedException(
      `Verification failed: ${location} parameter '${key}' must be of type '${expectedType}', got '${typeof value}'`,
    );
  }
  return value;
}

/**
 * 根据配置字段 schema（键为字段名，值为类型描述符字符串）批量校验调用方传入的 params。
 * 任意字段缺失或类型不匹配时抛出 UnauthorizedException。
 * 返回包含所有已校验键值对的普通对象。
 */
export function resolveParams<L extends string = string>(
  schema: Record<string, string>,
  params: Record<string, unknown>,
  location: L,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(schema).map(([key, expectedType]) => [
      key,
      assertValue(key, params[key], expectedType, location),
    ]),
  );
}
