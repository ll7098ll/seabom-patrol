# GitHub 업로드와 정적 배포

[README로 돌아가기](../README.md)

## 올릴 폴더

GitHub_업로드용 폴더 **안의 내용**을 저장소 최상위에 올립니다. 저장소 첫 화면에 README.md, package.json, src/, public/, docs/, .github/가 나란히 있어야 합니다. 상위 작업 폴더 전체나 ZIP 파일 자체를 저장소 소스 대신 올리지 마세요.

이 폴더에는 기존 .git 이력이 없으며 원래 저장소의 원격 주소·배포 계정 설정을 포함하지 않습니다. ZIP을 풀면 .github/, .gitignore, .gitattributes 같은 점으로 시작하는 항목도 함께 확인하세요.

## 권장: Git으로 새 저장소에 업로드

GitHub에서 README·라이선스·gitignore 자동 생성을 선택하지 않은 빈 저장소를 만듭니다. 아래 명령은 GitHub_업로드용 폴더의 터미널에서 실행합니다. USERNAME과 REPOSITORY는 실제 값으로 바꾸세요.

~~~sh
git init
git branch -M main
git add .
git status --short
git commit -m "Prepare Saebom patrol lab for GitHub"
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
~~~

기존 파일이 있는 저장소에는 이 초기 업로드 명령을 그대로 적용하지 말고 먼저 해당 저장소를 복제한 뒤 변경을 비교해 반영하세요. 기존 이력을 덮어쓰는 강제 push는 필요하지 않습니다.

GitHub Desktop을 쓴다면 이 폴더에서 새 저장소를 만들고 파일 목록을 확인한 뒤 커밋·Publish repository를 진행할 수 있습니다. 웹 업로드를 쓴다면 점으로 시작하는 구성 파일과 워크플로가 빠지지 않았는지 반드시 확인하세요.

## 자동 빌드 검사

포함된 [ci.yml](../.github/workflows/ci.yml)은 push와 pull request에서 Node.js 24, npm ci, npm run build를 실행합니다. 빌드에는 모형·패키지 검사가 포함됩니다. Actions 검사 성공은 배포 완료를 뜻하지 않습니다.

## GitHub Pages에 게시

1. 저장소의 Settings → Pages → Build and deployment → Source를 **GitHub Actions**로 선택합니다.
2. Actions에서 **Deploy GitHub Pages**를 선택합니다.
3. main 브랜치를 선택하고 **Run workflow**를 실행합니다. 이 워크플로는 수동 실행만 지원합니다.
4. 완료 후 github-pages 환경에 표시된 주소를 엽니다.

워크플로는 Pages가 알려 주는 base_path를 VITE_BASE_PATH에 전달하고 dist/를 게시합니다. 일반 저장소의 /REPOSITORY/ 하위 경로와 루트 주소에 대응하며, README나 docs/는 사이트 배포 대상이 아닙니다. 원본으로 보존한 이전 사이트는 같은 기본 경로의 legacy/에서 열립니다.

Pages 사용 가능 여부와 Actions 실행 권한은 계정·저장소 설정에 따릅니다. 공식 절차는 [GitHub Pages 사용자 정의 워크플로](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)와 [Vite GitHub Pages 안내](https://vite.dev/guide/static-deploy.html#github-pages)를 참고하세요.

## 다른 정적 호스팅

설치 명령은 npm ci, 빌드 명령은 npm run build, 게시 폴더는 dist입니다. 기본 루트 주소에서는 별도 환경변수가 필요하지 않습니다. 하위 경로 /example/에 올리면 VITE_BASE_PATH=/example/로 빌드합니다.

Windows PowerShell 예시:

~~~powershell
$env:VITE_BASE_PATH = '/example/'
npm run build
Remove-Item Env:VITE_BASE_PATH
~~~

npm run preview로 빌드 결과를 HTTP로 확인합니다. Vite preview는 로컬 확인용입니다. 서버의 MIME 유형과 하위 경로 설정이 JS 모듈·Worker·JSON을 정상 제공하는지 확인하세요.

## 업로드 후 확인

- README의 이미지와 문서 링크가 열리는지 확인합니다.
- Actions 빌드가 통과했는지 확인합니다.
- 사이트에서 도시 자료·글꼴·로고·검증 창이 로드되는지 확인합니다.
- 관찰 완료 → 예시 10대 → 운영 계산을 한 번 진행합니다.
- 이전 사이트 링크와 JSON 내보내기/불러오기를 확인합니다.

이 폴더를 만든 시점에는 원격 저장소 생성·push·사이트 게시를 실행하지 않았습니다.
