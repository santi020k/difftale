import { isRecord } from './is-record'

export const getString = (record: Record<string, unknown>, key: string): string | undefined => {
  const value = record[key]

  return typeof value === 'string' ? value : undefined
}

export const getOptionalBoolean = (
  record: Record<string, unknown>,
  key: string,
): boolean | undefined => {
  const value = record[key]

  return typeof value === 'boolean' ? value : undefined
}

export const getRecordArray = (
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown>[] => {
  const value = record[key]

  return Array.isArray(value) ? value.filter(isRecord) : []
}
