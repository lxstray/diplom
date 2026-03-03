import 'dotenv/config';

export const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

export const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'http://localhost:2358';
export const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;

// Judge0 language IDs (https://ce.judge0.com/)
export const JUDGE0_LANGUAGES = {
  javascript: 93, // JavaScript (Node.js 18.15.0)
  typescript: 94, // TypeScript (5.0.3) - if available, fallback to JS
  python: 71,     // Python (3.11.2)
  java: 62,       // Java (OpenJDK 19.0.2)
  cpp: 76,        // C++ (GCC 12.2.0)
  go: 60,         // Go (1.20.2)
  rust: 73,       // Rust (1.68.2)
} as const;

export type SupportedLanguage = keyof typeof JUDGE0_LANGUAGES;
