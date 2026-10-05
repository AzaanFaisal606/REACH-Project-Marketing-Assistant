// Name-based model filters for providers whose model list has no capability
// flags and mixes chat models with embeddings, TTS, image models, etc.

// OpenAI: keep chat-capable families, drop the specialised ones.
const CHAT_FAMILY = /^(gpt-|o\d|chatgpt-)/;
const NOT_CHAT = /(audio|realtime|transcribe|tts|image|search|embedding|instruct|codex|deep-research|-pro\b|live|whisper|moderation|computer-use|cyber|rosalind|daybreak)/;
// Dated snapshots (gpt-5-2025-08-07, gpt-4-0613) just duplicate their alias.
const SNAPSHOT = /-(\d{4}-\d{2}-\d{2}|\d{4})$/;

export function isChatModelId(id: string): boolean {
  return CHAT_FAMILY.test(id) && !NOT_CHAT.test(id) && !SNAPSHOT.test(id);
}

// Gemini: only text-generation Gemini models (no Gemma, embeddings, TTS, live, image).
const GEMINI_NOT_TEXT = /(embedding|image|tts|audio|live|robotics|computer-use|aqa)/i;

export function isGeminiTextModel(id: string): boolean {
  return id.startsWith("gemini") && !GEMINI_NOT_TEXT.test(id);
}
