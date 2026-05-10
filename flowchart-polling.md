# Блок-схема: Polling Execution Result Algorithm

```mermaid
flowchart TD
    Start([Начало: pollExecutionResult<br/>submissionId, maxAttempts=30, intervalMs=100]) --> InitAttempt[attempt = 0]
    InitAttempt --> LoopCheck{attempt < maxAttempts?}
    
    LoopCheck -->|Нет| Timeout[throw Error:<br/>'Execution timeout']
    Timeout --> EndError([Конец: Ошибка])
    
    LoopCheck -->|Да| FetchAPI[fetch Judge0 API:<br/>GET /submissions/submissionId<br/>with base64_encoded=true]
    FetchAPI --> CheckResponse{response.ok?}
    
    CheckResponse -->|Нет| ParseError[error = response.text]
    ParseError --> ThrowError[throw Error:<br/>'Failed to get result']
    ThrowError --> EndError2([Конец: Ошибка])
    
    CheckResponse -->|Да| ParseJSON[result = response.json]
    ParseJSON --> CheckStatus{result.status.id > 2?}
    
    CheckStatus -->|Нет<br/>In Queue/Processing| Sleep[await sleep intervalMs]
    Sleep --> IncrementAttempt[attempt++]
    IncrementAttempt --> LoopCheck
    
    CheckStatus -->|Да<br/>Completed| DecodeFields[Декодировать base64:<br/>stdout, stderr,<br/>compile_output, message]
    DecodeFields --> BuildResult[Создать ExecutionResult:<br/>id, status, stdout,<br/>stderr, time, memory, etc]
    BuildResult --> ReturnResult[return ExecutionResult]
    ReturnResult --> EndSuccess([Конец: Успех])
    
    style Start fill:#e1f5e1
    style EndError fill:#ffe1e1
    style EndError2 fill:#ffe1e1
    style EndSuccess fill:#e1ffe1
    style LoopCheck fill:#fff4e1
    style CheckResponse fill:#fff4e1
    style CheckStatus fill:#fff4e1
    style Sleep fill:#e1e5ff
```

## Описание алгоритма

**Назначение:** Опрос Judge0 API до завершения выполнения кода

**Принцип работы:**
1. Цикл с максимум 30 попытками
2. На каждой итерации делает GET запрос к Judge0 API
3. Проверяет статус выполнения:
   - `status.id <= 2` (In Queue/Processing) → ждет 100ms и повторяет
   - `status.id > 2` (Completed/Error) → декодирует результат и возвращает
4. Если превышен лимит попыток → выбрасывает timeout ошибку

**Параметры:**
- `maxAttempts = 30` (максимум попыток)
- `intervalMs = 100` (интервал между попытками)
- Максимальное время ожидания: 30 × 100ms = 3 секунды

**Статусы Judge0:**
- `1` = In Queue
- `2` = Processing  
- `3` = Accepted
- `4+` = Error states (Wrong Answer, Compilation Error, etc.)

**Оптимизация:**
- Использует `base64_encoded=true` для корректной передачи UTF-8
- Запрашивает только нужные поля через `fields` параметр
- Декодирует base64 через `decodeMaybeBase64` с fallback
