import type { MessageKey } from '../i18n';

/** The “About us” people; photos are public/team/{photo}.jpg (480×600). */
export const TEAM: ReadonlyArray<{ name: string; photo: string; role: MessageKey }> = [
  { name: 'Берікқызы Ғайнижамал', photo: 'gainizhamal', role: 'about.role.student' },
  { name: 'Ерланқызы Айшабибі', photo: 'aishabibi', role: 'about.role.student' },
  { name: 'Рашитова Мадина Бақытжанқызы', photo: 'madina', role: 'about.role.deputy' },
  { name: 'Құрақбаева Айнұр', photo: 'ainur', role: 'about.role.physics' },
];
