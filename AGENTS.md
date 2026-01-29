# AI Agent 규칙

이 프로젝트는 React + TypeScript + Vite + shadcn/ui를 사용합니다.

## UI 컴포넌트 및 디자인

### shadcn/ui 적극 활용
- 모든 UI 컴포넌트는 **shadcn/ui**를 우선적으로 사용합니다
- 새로운 UI가 필요할 때는 shadcn/ui 컴포넌트를 먼저 확인하고 활용합니다
- shadcn/ui의 컴포넌트를 커스터마이징하여 디자인 일관성을 유지합니다

### 컴포넌트 추가 방법
컴포넌트를 추가할 때는 **반드시 터미널 명령어**를 사용합니다:

```bash
# shadcn/ui 컴포넌트 추가 예시
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
```

**중요**: 컴포넌트 파일을 직접 생성하지 말고, 공식 CLI 명령어를 통해 추가합니다.

## 예시

### ❌ 잘못된 방법
```typescript
// 직접 컴포넌트 파일을 생성하거나 코드를 복사
// src/components/ui/card.tsx 파일을 직접 작성
```

### ✅ 올바른 방법
```bash
# 터미널에서 명령어 실행
npx shadcn@latest add card
```

```typescript
// 추가된 컴포넌트를 import하여 사용
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
```

## 개발 원칙

1. **shadcn/ui 우선**: 새로운 UI 요소가 필요하면 shadcn/ui에서 제공하는지 먼저 확인
2. **CLI 사용**: 모든 shadcn 컴포넌트는 CLI로 추가
3. **커스터마이징**: 필요한 경우 추가된 컴포넌트를 수정하여 사용
4. **일관성 유지**: 프로젝트 전반에 걸쳐 shadcn/ui 스타일 가이드 준수
