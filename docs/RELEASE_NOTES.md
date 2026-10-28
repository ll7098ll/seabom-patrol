# GitHub 업로드용 정리 내역

[README로 돌아가기](../README.md)

정리일: 2026-10-29. 기준은 작업 폴더의 saebom-site-update React 3.0.0 버전입니다. 과거의 saebom-patrol-lab-final 1.0.0 HTML 묶음과 구별합니다. 원본 작업 폴더는 수정하지 않았습니다.

## 포함

- 최신 React 화면, 도로 직접 배치, 관찰 미션과 근거, 전담 구역 순찰 모형
- 실제 실행에 쓰는 확정 도시 JSON과 검증 JSON
- 브랜드 SVG, 로컬 Pretendard 글꼴과 기존 라이선스 원문
- 이전 사이트 14개 원본 파일과 SHA-256 기준
- 모형 검사와 이전 엔진 회귀 기준 파일
- 현재 버전에 맞춘 README, 9개 안내 문서, 화면 이미지
- 자동 빌드 검사와 수동 GitHub Pages 배포 워크플로

## 제외

기존 .git, node_modules/, dist/, .openai/, .sites-runtime/, 로컬 로그·계정별 호스팅 설정, 이전 시안·백업·중간 압축 파일, 외부 뉴스 영상, 별도 형제 폴더를 요구하는 보존 검사, 과거 데이터 생성·수정 도구를 제외했습니다.

## 독립 업로드를 위한 수정

1. 특정 호스팅 프로젝트 ID가 있어야 통과하던 검사를 독립 패키지 검사로 바꿨습니다.
2. JSON·로고·이전 사이트 경로를 Vite 기본 경로에 맞게 변경했습니다. 계산·배정·구역·순찰 규칙은 변경하지 않았습니다.
3. VITE_BASE_PATH 설정과 Pages 워크플로를 추가했습니다.
4. 불필요한 로컬 파일을 제외하는 .gitignore를 작성했습니다.

public/legacy/는 원본 바이트 그대로 보존하며, 기존 .gitattributes의 텍스트 변환 금지 규칙을 유지했습니다. package.json의 기존 이름·버전·의존성과 lockfile을 유지하고 설명·검사 명령을 정리했습니다.

## 배포물

업로드용 폴더와 ZIP은 동일한 소스를 제공합니다. ZIP에는 설치 후 생기는 node_modules/와 빌드 산출물 dist/가 들어가지 않습니다. 빌드는 npm ci 후 npm run build로 재생성합니다. 검증 결과는 [VALIDATION.md](VALIDATION.md)에 기록합니다.
