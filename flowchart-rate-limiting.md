# Блок-схема: Rate Limiting Algorithm

```mermaid
flowchart TD
    Start([Начало: checkRateLimit userId]) --> GetNow[now = Date.now]
    GetNow --> GetEntry[entry = rateLimitMap.get userId]
    GetEntry --> CheckEntry{entry exists AND<br/>now <= entry.resetAt?}
    
    CheckEntry -->|Нет| NewWindow[Создать новое окно:<br/>count = 1<br/>resetAt = now + WINDOW_MS]
    NewWindow --> SaveNew[rateLimitMap.set userId, entry]
    SaveNew --> ReturnAllowed1[return:<br/>allowed = true<br/>remaining = MAX - 1<br/>resetAt]
    ReturnAllowed1 --> End1([Конец])
    
    CheckEntry -->|Да| CheckLimit{entry.count >= MAX?}
    CheckLimit -->|Да| ReturnDenied[return:<br/>allowed = false<br/>remaining = 0<br/>resetAt = entry.resetAt]
    ReturnDenied --> End2([Конец])
    
    CheckLimit -->|Нет| Increment[entry.count++]
    Increment --> ReturnAllowed2[return:<br/>allowed = true<br/>remaining = MAX - count<br/>resetAt = entry.resetAt]
    ReturnAllowed2 --> End3([Конец])
    
    style Start fill:#e1f5e1
    style End1 fill:#ffe1e1
    style End2 fill:#ffe1e1
    style End3 fill:#ffe1e1
    style CheckEntry fill:#fff4e1
    style CheckLimit fill:#fff4e1
```

## Описание алгоритма

**Назначение:** Ограничение частоты запросов пользователя (10 запросов в минуту)

**Принцип работы:**
1. Проверяет текущее время и ищет запись пользователя в Map
2. Если записи нет или окно истекло → создает новое окно (count=1)
3. Если окно активно и лимит достигнут → отклоняет запрос
4. Если окно активно и лимит не достигнут → инкрементирует счетчик

**Константы:**
- `RATE_LIMIT_WINDOW_MS = 60000` (1 минута)
- `MAX_REQUESTS_PER_WINDOW = 10`

**Структура данных:**
```typescript
interface RateLimitEntry {
  count: number;      // текущее количество запросов
  resetAt: number;    // timestamp сброса окна
}
```
