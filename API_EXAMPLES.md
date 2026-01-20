# API Examples

## Authentication

### 1. Request Magic Link

```bash
curl -X POST http://localhost:3001/auth/start \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

Response:
```json
{
  "success": true,
  "message": "Magic link created. Check your email (or logs in dev mode).",
  "expiresAt": "2024-01-20T10:15:00Z",
  "token": "abc123..." // Only in dev mode
}
```

### 2. Verify Token

```bash
curl -X POST http://localhost:3001/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"token": "abc123..."}'
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "personId": "clr123...",
  "email": "test@example.com"
}
```

## Sessions

### Create New Session

```bash
export TOKEN="eyJhbGc..."

curl -X POST http://localhost:3001/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"module": "profile_header"}'
```

### Get All Sessions

```bash
curl -X GET http://localhost:3001/sessions \
  -H "Authorization: Bearer $TOKEN"
```

### Get Session Details

```bash
export SESSION_ID="clr456..."

curl -X GET http://localhost:3001/sessions/$SESSION_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Upload Audio Turn

```bash
# Record audio first (or use test file)
curl -X POST http://localhost:3001/sessions/$SESSION_ID/turns \
  -H "Authorization: Bearer $TOKEN" \
  -F "audio=@recording.webm"
```

Response:
```json
{
  "success": true,
  "turn": {
    "id": "clr789...",
    "transcript": "I'm currently a Senior Product Manager at TechCorp...",
    "audioUrl": "/uploads/audio_abc.webm",
    "timestamp": "2024-01-20T10:00:00Z"
  }
}
```

### Get Next Agent Question

```bash
curl -X POST http://localhost:3001/sessions/$SESSION_ID/agent/next \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

Response:
```json
{
  "success": true,
  "question": "Can you tell me more about your responsibilities in that role?",
  "audioUrl": "/uploads/tts_xyz.mp3",
  "shouldExtract": false
}
```

### Manually Trigger Extraction

```bash
curl -X POST http://localhost:3001/sessions/$SESSION_ID/extract \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Knowledge Base

### Search

```bash
curl -X GET "http://localhost:3001/kb/search?q=product+management&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Stats

```bash
curl -X GET http://localhost:3001/kb/stats \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "success": true,
  "stats": {
    "facts": 12,
    "timeline": 5,
    "skills": 18,
    "preferences": 7,
    "artifacts": 3,
    "openQuestions": 4,
    "sessions": 2
  }
}
```

### Export Knowledge Base

```bash
# JSON format
curl -X GET "http://localhost:3001/kb/export?format=json" \
  -H "Authorization: Bearer $TOKEN" \
  -o kb_export.json

# Markdown format
curl -X GET "http://localhost:3001/kb/export?format=markdown" \
  -H "Authorization: Bearer $TOKEN" \
  -o kb_export.md
```

## Health Check

```bash
curl -X GET http://localhost:3001/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-20T10:00:00Z"
}
```

## Testing Audio Recording

### Record Audio with FFmpeg

```bash
# Record 10 seconds of audio from microphone
ffmpeg -f avfoundation -i ":0" -t 10 -c:a libopus test_recording.webm

# Or use SoX
sox -d -r 48000 -c 1 test_recording.webm trim 0 10
```

### Test Audio Upload

```bash
curl -X POST http://localhost:3001/sessions/$SESSION_ID/turns \
  -H "Authorization: Bearer $TOKEN" \
  -F "audio=@test_recording.webm"
```

## Connector Framework

### Execute Connector Operation

The connector operations are internal to the backend, but you can test them via the node REPL:

```typescript
// In backend directory
npm run dev

// Then in another terminal
node
> const { connectorManager } = require('./dist/connectors/connector.manager')
> await connectorManager.execute('mock', 'create', 'test', { name: 'Test Item' })
> await connectorManager.execute('mock', 'search', 'test', 'Test')
> await connectorManager.healthCheckAll()
```

## Cost Tracking

### Query Costs (SQL)

```sql
-- Total costs by service
SELECT
  service,
  SUM(cost_usd) as total_cost,
  SUM(units) as total_units,
  COUNT(*) as call_count
FROM cost_tracking
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY service
ORDER BY total_cost DESC;

-- Costs per session
SELECT
  s.id,
  s.module,
  SUM(ct.cost_usd) as session_cost,
  COUNT(t.id) as turn_count
FROM sessions s
LEFT JOIN cost_tracking ct ON ct.session_id = s.id
LEFT JOIN turns t ON t.session_id = s.id
WHERE s.created_at > NOW() - INTERVAL '30 days'
GROUP BY s.id, s.module
ORDER BY session_cost DESC;
```

## End-to-End Flow Example

```bash
# 1. Authenticate
TOKEN=$(curl -s -X POST http://localhost:3001/auth/start \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@example.com"}' | jq -r '.token')

VERIFIED=$(curl -s -X POST http://localhost:3001/auth/verify \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\"}")

JWT=$(echo $VERIFIED | jq -r '.token')

# 2. Create session
SESSION=$(curl -s -X POST http://localhost:3001/sessions \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{}')

SESSION_ID=$(echo $SESSION | jq -r '.session.id')

# 3. Get first question
curl -s -X POST http://localhost:3001/sessions/$SESSION_ID/agent/next \
  -H "Authorization: Bearer $JWT" | jq '.question'

# 4. Record and upload answer (manual step)
# Record audio, then:
curl -X POST http://localhost:3001/sessions/$SESSION_ID/turns \
  -H "Authorization: Bearer $JWT" \
  -F "audio=@my_answer.webm"

# 5. Get next question
curl -s -X POST http://localhost:3001/sessions/$SESSION_ID/agent/next \
  -H "Authorization: Bearer $JWT" | jq '.question'

# 6. Continue interview...

# 7. Check KB stats
curl -s -X GET http://localhost:3001/kb/stats \
  -H "Authorization: Bearer $JWT" | jq '.stats'
```

## Troubleshooting

### Check Backend Logs

```bash
docker-compose logs -f backend
```

### Test Database Connection

```bash
docker-compose exec backend npm run db:studio
```

### Verify OpenAI API Key

```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" | jq '.data[0]'
```
