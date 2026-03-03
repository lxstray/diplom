import 'dotenv/config';

export const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

export const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'http://localhost:2358';
export const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;

// Judge0 language IDs (https://ce.judge0.com/)
export const JUDGE0_LANGUAGES = {
  // These IDs must match your self-hosted Judge0 instance.
  // For judge0/judge0:latest (older image), common IDs are:
  javascript: 63, // JavaScript (Node.js 12.14.0)
  typescript: 74, // TypeScript (3.7.4)
  python: 71,     // Python (3.8.1)
  java: 62,       // Java (OpenJDK 13.0.1)
  cpp: 76,        // C++ (Clang 7.0.1)
  go: 60,         // Go (1.13.5)
  rust: 73,       // Rust (1.40.0)
} as const;

export type SupportedLanguage = keyof typeof JUDGE0_LANGUAGES;
