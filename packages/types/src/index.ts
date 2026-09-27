export type ApiResponse<T> = { data: T };
export type ApiError = { error: { code: string; message: string } };
export * from './domain';
export * from './workout';
export * from './meal';
export * from './body';
export * from './statistics';
