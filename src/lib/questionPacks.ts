import { QuestionPack } from "@/lib/gameState";
import popCultureEn from "@/data/popCulture.json";
import popCultureEs from "@/data/popCultureEs.json";
import canariasEs from "@/data/CanariasES.json";

type LanguageCode = 'en' | 'es';
type PackLanguageMap = Partial<Record<LanguageCode, QuestionPack>>;

export const QUESTION_PACK_DATA: Record<string, PackLanguageMap> = {
  pop_culture: {
    en: popCultureEn as QuestionPack,
    es: popCultureEs as QuestionPack
  },
  canarias_es: {
    es: canariasEs as QuestionPack
  }
};

export const PACK_LOCALES: Record<string, LanguageCode[]> = {
  pop_culture: ['en', 'es'],
  canarias_es: ['es'],
  travel_places: ['en'],
  impossible: ['en'],
  troll_corner: ['en'],
  grandparents: ['en']
};

export const DEFAULT_FREE_PACKS: string[] = ['pop_culture', 'canarias_es'];

export function getQuestionPack(packId: string, language: LanguageCode): QuestionPack | undefined {
  return QUESTION_PACK_DATA[packId]?.[language];
}

export function getQuestionPacks(packIds: string[], language: LanguageCode): QuestionPack[] {
  return packIds
    .map((id) => getQuestionPack(id, language))
    .filter((pack): pack is QuestionPack => Boolean(pack));
}
