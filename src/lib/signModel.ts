import { SIGNS_BY_ID } from '../data/signs';
import { unpackModel, type SignModel, type StoredSignModel } from '../gesture/signTemplates';

let loading: Promise<SignModel> | null = null;

/**
 * Templates of the video signs (data/signModel.json, `npm run sign-model`),
 * loaded with the camera rather than with the page. Signs are renamed to the
 * dictionary words they stand for.
 */
export function loadSignModel(): Promise<SignModel> {
  if (!loading) {
    loading = import('../data/signModel.json').then(({ default: stored }) => {
      const model = unpackModel(stored as StoredSignModel);
      return { ...model, templates: model.templates.map((t) => ({ ...t, id: SIGNS_BY_ID.get(t.id)?.wordId ?? t.id })) };
    });
    // Let a later call retry after a failed load (e.g. offline before the chunk was cached).
    loading.catch(() => {
      loading = null;
    });
  }
  return loading;
}
