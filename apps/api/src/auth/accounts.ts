import type { PrismaClient } from '@myfit/database';
import { passwordHash } from './auth.service';
export async function manageAccount(
  db: PrismaClient,
  mode: 'create' | 'reset',
  email: string,
  name: string,
  password: string,
) {
  email = email.trim().toLowerCase();
  name = name.trim();
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    !name ||
    name.length > 100 ||
    password.length < 12 ||
    password.length > 128
  )
    throw new Error(
      'Invalid account fields. Password must be 12–128 characters.',
    );
  const hashed = await passwordHash(password);
  return db.$transaction(async (tx) => {
    if (mode === 'create')
      return tx.user.create({
        data: {
          email,
          name,
          passwordHash: hashed,
          goal: { create: {} },
          preference: { create: {} },
        },
        select: { id: true },
      });
    const user = await tx.user.update({
      where: { email },
      data: { passwordHash: hashed },
      select: { id: true },
    });
    await tx.session.deleteMany({ where: { userId: user.id } });
    return user;
  });
}
