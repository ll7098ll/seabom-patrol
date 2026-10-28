# 개발·수정 안내

[README로 돌아가기](../README.md)

## 환경과 명령

Node.js 22.12 이상, npm과 최신 브라우저를 사용합니다. Node.js 24에서 패키지를 검증했습니다. package-lock.json을 포함하므로 npm ci로 잠긴 의존성을 설치합니다.

~~~sh
npm ci
npm run dev
npm run verify
npm run check:package
npm run build
npm run preview
~~~

개발·미리보기 서버는 127.0.0.1:5176에 열립니다. 포트가 사용 중이면 서버가 임의 포트로 옮기지 않고 종료됩니다. npm run dev -- --port 5177처럼 포트를 지정하세요. 다른 주소에서는 브라우저 저장 자료가 달라집니다.

## 코드 지도

| 경로 | 역할 |
|---|---|
| src/main.jsx | JSON 로딩, 도로·GIS 객체 준비, React 시작 |
| src/App.jsx | 학습 단계, 상태, 배치, 기록, Worker 요청 |
| src/FreeMap.jsx | SVG 지도, 도로 배치, 구역과 순찰 코스 |
| src/Panels.jsx / src/ObservationGuide.jsx | 자료·차량·기록·근거 UI |
| src/OperationsViews.jsx | 시간 재생과 차량·사건 현황 |
| src/model/gis.js | 격자 집계와 지도 자료 |
| src/model/student-layers.js / student-presentation.js | 8개 레이어와 표현·단위·범례 |
| src/model/placement.js | 도로 스냅, 배치 복원·검증, 단일 경로 비교 |
| src/model/territories.js | 담당 구역과 순찰 코스 |
| src/model/engine.js | 시간순 배정·업무·도착시간 |
| src/simulation/worker.js | 메인 화면을 막지 않고 비교 계산 |
| src/simulation/operations.js / audit.js | 재생용 상태·지표·감사 |
| public/data/saebom-city.json | 확정된 가상 도시 자료 |
| public/data/verification.json | npm run verify가 갱신하는 검사 결과 |
| legacy-integrity.json | 이전 사이트 14개 파일의 SHA-256 기준 |
| scripts/verify.mjs | 전역 배정 회귀 검사와 전담 순찰 검사 |
| scripts/check-package.mjs | 문서 링크·필수 자료·보존 무결성·휴대성 검사 |

React·React DOM·Lucide React가 런타임 의존성이며 Vite와 React 플러그인이 개발 의존성입니다. 정확한 버전은 lockfile을 확인하세요.

## 수정 순서

1. 화면 문구·스타일은 src/의 JSX·CSS를 수정합니다.
2. 배치·구역·운영 규칙은 model/과 simulation/에서 수정하고 해당 의미가 담긴 검사를 함께 유지합니다.
3. 자료를 바꾸면 기간·건수·지표 설명과 965건을 전제로 한 검사를 검토합니다.
4. npm run build로 검사를 통과한 뒤 npm run preview에서 화면을 확인합니다.

verify는 verification.json에 검사 시각과 결과를 기록하므로 실행 후 해당 파일이 변경될 수 있습니다. public/legacy/는 원본 보존 대상입니다. 내용을 바꾸면 패키지 검사가 실패합니다. 무결성 기준을 검사를 통과시키기 위한 목적으로 무작정 다시 만들지 마세요.

## 경로와 저장

일반 정적 호스팅의 기본 경로는 /입니다. 저장소 하위 주소는 VITE_BASE_PATH 환경변수로 지정합니다. main.jsx, App.jsx, Panels.jsx의 공개 자료 경로는 import.meta.env.BASE_URL을 사용합니다. Vite는 CSS 글꼴과 HTML 자산 경로도 빌드 기준 경로에 맞춥니다.

현재 학습 기록 키는 saebom-road-placement-v1입니다. 동일 출처의 다른 복사본과 공유될 수 있습니다. 새 제품으로 분리한다면 저장 키와 JSON app/version 호환성을 함께 검토하세요. 관찰 완료·계산 결과는 저장되지 않으며 다시 계산합니다.

이전 작업 폴더의 보존 검사는 형제 폴더 126개 파일을 참조합니다. 이 패키지에는 형제 폴더를 요구하는 검사·호스팅 프로젝트 ID 검사·복사 준비 스크립트를 포함하지 않습니다. 독립 패키지 검사는 이 폴더만 사용합니다.
