import type { WorkoutRecord } from '@myfit/types';
import { api } from '../api';
import {
  hasActiveUnsynced,
  stopAccountDrafts,
  type DraftTransport,
} from './engine';
import { clearDrafts, listDrafts } from './storage';
export const sendDraft: DraftTransport = async (id, payload, signal) => {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 15000);
  try {
    return await api<WorkoutRecord>(`/workouts/${id}`, {
      method: 'PUT',
      json: payload,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
  }
};
export async function confirmDraftLogout(userId: string) {
  try {
    const drafts = await listDrafts(userId);
    return (
      (!hasActiveUnsynced(userId) &&
        !drafts.some((d) => d.syncState !== 'SYNCED' || d.pendingPayload)) ||
      confirm(
        '서버에 저장하지 않은 운동 입력이 있습니다. 이 계정의 기기 입력을 지우고 로그아웃할까요?',
      )
    );
  } catch {
    return confirm(
      '기기 저장 상태를 확인하지 못했습니다. 입력을 정리하고 로그아웃할까요?',
    );
  }
}
export async function discardAccountDrafts(userId: string) {
  await stopAccountDrafts(userId);
  await clearDrafts(userId);
}
